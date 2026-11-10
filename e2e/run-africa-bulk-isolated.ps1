[CmdletBinding()]
param(
  [string]$WorktreeRoot = (Join-Path $env:USERPROFILE "Jobly-e2e-recette-lot01"),
  [string]$SourceRoot = (Join-Path $env:USERPROFILE "Jobly"),
  [string]$FetchedSha = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$Log = Join-Path $env:TEMP "jobly-africa-bulk-launch.log"
$RunRoot = Join-Path $env:TEMP ("jobly-africa-bulk-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [guid]::NewGuid().ToString("N").Substring(0,8))
$Archive = $RunRoot + ".zip"
$Report = Join-Path $RunRoot "artifacts\e2e\africa-bulk-recipe-report.json"
$ExitCode = 1

Set-Content -LiteralPath $Log -Value ("JOBLY AFRICA BULK LAUNCH " + (Get-Date -Format o)) -Encoding UTF8

function Write-Stage([string]$Message) {
  Write-Host $Message
  Add-Content -LiteralPath $Log -Value $Message -Encoding UTF8
}

Write-Stage ("LAUNCH_LOG " + $Log)

function Invoke-Native([string]$FilePath, [string[]]$Arguments, [string]$Label, [switch]$Capture) {
  Write-Stage (">>> " + $Label)
  if ($Capture) {
    $nativeOutput = @(& $FilePath @Arguments 2>&1)
    $nativeExit = $LASTEXITCODE
    foreach ($line in $nativeOutput) {
      $lineText = [string]$line
      Write-Host $lineText
      Add-Content -LiteralPath $Log -Value $lineText -Encoding UTF8
    }
    if ($nativeExit -ne 0) {
      throw ($Label + " failed with exit code " + $nativeExit)
    }
    return ($nativeOutput -join [Environment]::NewLine)
  }

  # Stream native output directly to the console and the stable log.
  # Buffering in an array hid fetch/test/runtime progress until the process ended.
  & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
  $nativeExit = $LASTEXITCODE
  if ($nativeExit -ne 0) {
    throw ($Label + " failed with exit code " + $nativeExit)
  }
}

try {
  if (-not (Test-Path -LiteralPath $SourceRoot)) {
    throw ("SOURCE_ROOT_NOT_FOUND: " + $SourceRoot)
  }

  $Candidates = @($WorktreeRoot, $SourceRoot) | Select-Object -Unique
  $GitRoot = $null
  foreach ($candidate in $Candidates) {
    if (-not (Test-Path -LiteralPath (Join-Path $candidate ".git"))) {
      Write-Stage ("SKIP_NO_GIT_METADATA " + $candidate)
      continue
    }
    try {
      $remote = (Invoke-Native "git" @("-C", $candidate, "remote", "get-url", "origin") "CHECK_ORIGIN" -Capture).Trim()
      if ($remote -notmatch "(?i)github\.com[:/]kenzimayaka-glitch/Jobly(?:\.git)?$") {
        throw ("UNEXPECTED_ORIGIN: " + $remote)
      }
      if ($FetchedSha) {
        if ($FetchedSha -notmatch "^[0-9a-f]{40}$") {
          throw "FETCHED_SHA_INVALID"
        }
        Invoke-Native "git" @("-C", $candidate, "cat-file", "-e", ($FetchedSha + "^{commit}")) "VERIFY_FETCHED_COMMIT" | Out-Null
        $sha = $FetchedSha
      } else {
        Invoke-Native "git" @("-C", $candidate, "fetch", "--depth=1", "--progress", "--no-tags", "origin", "refs/heads/e2e/recette") "FETCH_E2E_RECETTE" | Out-Null
        $sha = (Invoke-Native "git" @("-C", $candidate, "rev-parse", "FETCH_HEAD") "RESOLVE_FETCH_HEAD" -Capture).Trim()
        if ($sha -notmatch "^[0-9a-f]{40}$") {
          throw "FETCH_HEAD_INVALID"
        }
      }
      $GitRoot = $candidate
      break
    } catch {
      Write-Stage ("GIT_CANDIDATE_FAILED " + $candidate + " :: " + $_.Exception.Message)
    }
  }

  if (-not $GitRoot) {
    throw "GIT_FETCH_FAILED_ON_ALL_LOCAL_CHECKOUTS"
  }

  Write-Stage ("FETCH_OK " + $sha)
  New-Item -ItemType Directory -Path $RunRoot -Force | Out-Null
  Invoke-Native "git" @("-C", $GitRoot, "archive", "--format=zip", ("--output=" + $Archive), $sha) "EXPORT_EXACT_COMMIT" | Out-Null
  if (-not (Test-Path -LiteralPath $Archive)) {
    throw "GIT_ARCHIVE_FILE_MISSING"
  }
  Expand-Archive -LiteralPath $Archive -DestinationPath $RunRoot -Force
  Remove-Item -LiteralPath $Archive -Force
  Write-Stage ("SNAPSHOT_READY " + $RunRoot)

  $RunnerFile = Join-Path $RunRoot "e2e\africa-bulk-recipe.ts"
  $WrapperFile = Join-Path $RunRoot "e2e\run-africa-bulk-recipe.cmd"
  $TestFile = Join-Path $RunRoot "scripts\runtime-readonly-lots.test.mjs"
  if (-not (Test-Path -LiteralPath $RunnerFile) -or -not (Test-Path -LiteralPath $WrapperFile) -or -not (Test-Path -LiteralPath $TestFile)) {
    throw "SNAPSHOT_FILES_MISSING"
  }
  $runnerText = Get-Content -LiteralPath $RunnerFile -Raw
  $wrapperText = Get-Content -LiteralPath $WrapperFile -Raw
  if (-not $runnerText.Contains('const REF = "ofqqrryamslxoqkklraw"') -or
      -not $runnerText.Contains("E2E_SECRET_KEY_PROJECT_PROOF") -or
      -not $runnerText.Contains('if (key.startsWith("sb_secret_"))') -or
      $runnerText.Contains("SECRET_KEY_WITHOUT_E2E_URL_PROOF") -or
      -not $wrapperText.Contains("--node-modules-dir=none")) {
    throw "REMOTE_BRANCH_DOES_NOT_CONTAIN_EXPECTED_E2E_FIXES"
  }
  Write-Stage "E2E_GUARDS_VERIFIED"

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "NODE_NOT_FOUND_IN_PATH"
  }
  $denoPath = Join-Path $env:USERPROFILE ".deno\bin\deno.exe"
  if (-not (Test-Path -LiteralPath $denoPath)) {
    $denoCommand = Get-Command deno -ErrorAction SilentlyContinue
    if ($denoCommand) { $denoPath = $denoCommand.Source } else { throw "DENO_NOT_FOUND_IN_PATH" }
  }
  $denoVersion = @(& $denoPath --version 2>&1)
  foreach ($line in $denoVersion) { Write-Stage ([string]$line) }
  if ($denoVersion.Count -eq 0 -or ([string]$denoVersion[0]) -notmatch "^deno 2\.") {
    throw "DENO_2_REQUIRED"
  }
  Write-Stage "PREFLIGHT_NODE_DENO_OK"

  Push-Location $RunRoot
  try {
    Invoke-Native "node" @("--test", "scripts\runtime-readonly-lots.test.mjs") "STATIC_TESTS_11_GROUPS" | Out-Null

    $denoArgs = @(
      "run",
      "--node-modules-dir=none",
      ("--allow-read=" + $SourceRoot + "," + $RunRoot),
      ("--allow-write=" + (Join-Path $RunRoot "artifacts\e2e")),
      "--allow-net=ofqqrryamslxoqkklraw.supabase.co,registry.npmjs.org",
      "e2e\africa-bulk-recipe.ts",
      $SourceRoot
    )
    Invoke-Native $denoPath $denoArgs "AFRICA_BULK_RUNTIME" | Out-Null
    if (-not (Test-Path -LiteralPath $Report)) {
      throw "AFRICA_RUNTIME_REPORT_MISSING"
    }
    $runtimeReport = Get-Content -LiteralPath $Report -Raw | ConvertFrom-Json
    Write-Stage ("RUNTIME_REPORT_STATUS " + $runtimeReport.status)
    Write-Stage ("CLEANUP_VERIFIED " + $runtimeReport.cleanupVerified)
    if ($runtimeReport.status -ne "PASS" -or $runtimeReport.cleanupVerified -ne $true) {
      $ExitCode = 2
      Write-Stage "RUNTIME_RECIPE_NOT_PASS"
    } else {
      $ExitCode = 0
      Write-Stage "RUNTIME_RECIPE_PASS"
    }
  } finally {
    Pop-Location
  }

  Write-Stage ("RUN_SNAPSHOT " + $RunRoot)
  if (Test-Path -LiteralPath $Report) {
    Write-Stage ("REPORT " + $Report)
    Start-Process -FilePath notepad.exe -ArgumentList ('"{0}"' -f $Report)
  } else {
    Write-Stage "REPORT_MISSING_OPENING_LAUNCH_LOG"
    Start-Process -FilePath notepad.exe -ArgumentList ('"{0}"' -f $Log)
  }
} catch {
  $ExitCode = 1
  Write-Stage ("LAUNCH_FAILURE " + $_.Exception.Message)
  Write-Stage ("LOG " + $Log)
  Start-Process -FilePath notepad.exe -ArgumentList ('"{0}"' -f $Log)
} finally {
  if (Test-Path -LiteralPath $Archive) {
    Remove-Item -LiteralPath $Archive -Force -ErrorAction SilentlyContinue
  }
}
exit $ExitCode
