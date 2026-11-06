# Jobly Android release signing — Windows

This procedure creates the Jobly release keystore directly in **PKCS12** format.
Keep the private keystore and passwords on a machine and in backups controlled by the project owner.
Never commit the keystore, paste its contents into chat, or place it in a public artifact.

## 1. Check Java / keytool

Open Windows PowerShell and run:

```powershell
java -version
keytool -help
```

Use JDK 17 or newer. If `keytool` is not on PATH, install a JDK or use Android Studio's bundled JBR.

## 2. Generate the PKCS12 keystore

Run this whole block in PowerShell. It stops rather than overwriting an existing file.

```powershell
$ErrorActionPreference = "Stop"

$keytoolCommand = Get-Command keytool.exe -ErrorAction SilentlyContinue
if ($keytoolCommand) {
    $keytool = $keytoolCommand.Source
} else {
    $candidate = "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe"
    if (Test-Path $candidate) {
        $keytool = $candidate
    } else {
        throw "keytool.exe not found. Install JDK 17+ or Android Studio, then reopen PowerShell."
    }
}

$dir = Join-Path $env:USERPROFILE "Jobly-Android-Signing"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$keystore = Join-Path $dir "jobly-release.p12"
$certificate = Join-Path $dir "jobly-release-cert.der"

if (Test-Path $keystore) {
    throw "A keystore already exists at $keystore. Do not overwrite it."
}

& $keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore $keystore `
    -alias jobly-release `
    -keyalg RSA `
    -keysize 3072 `
    -sigalg SHA256withRSA `
    -validity 10000 `
    -dname "CN=Jobly Android Release, O=Jobly, L=Yaounde, ST=Centre, C=CM"

if ($LASTEXITCODE -ne 0) {
    throw "Keystore generation failed."
}

& $keytool -exportcert `
    -storetype PKCS12 `
    -keystore $keystore `
    -alias jobly-release `
    -file $certificate

if ($LASTEXITCODE -ne 0) {
    throw "Public certificate export failed."
}

$fingerprint = (Get-FileHash -Algorithm SHA256 -Path $certificate).Hash.ToUpperInvariant()
Write-Host "JOBLY_ANDROID_RELEASE_CERT_SHA256:" -ForegroundColor Green
Write-Host $fingerprint

$keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore))
Set-Clipboard -Value $keystoreBase64
Remove-Variable keystoreBase64

Write-Host "The PKCS12 keystore was created at: $keystore"
Write-Host "Its Base64 encoding is now in the clipboard for the GitHub secret field."
```

When prompted, choose a long, unique keystore password and save it in your password manager. At the key-password prompt, press **Enter** to use the same password. PKCS12 uses the same password for the keystore and key in this workflow.

The password is intentionally entered interactively, not embedded in this script or in shell history.

## 3. Save the five GitHub repository secrets

Open the repository's **Settings → Secrets and variables → Actions → New repository secret**:

https://github.com/kenzimayaka-glitch/Jobly/settings/secrets/actions

Create these secrets individually:

| Secret name | Value |
| --- | --- |
| `JOBLY_ANDROID_KEYSTORE_BASE64` | Paste the Base64 value from the clipboard |
| `JOBLY_ANDROID_KEYSTORE_PASSWORD` | The password chosen during key generation |
| `JOBLY_ANDROID_KEY_ALIAS` | `jobly-release` |
| `JOBLY_ANDROID_KEY_PASSWORD` | The same password as the keystore |
| `JOBLY_ANDROID_RELEASE_CERT_SHA256` | The SHA-256 fingerprint printed by PowerShell |

After pasting the Base64 value into GitHub, clear the clipboard:

```powershell
Set-Clipboard -Value ""
```

Then open the **Variables** tab and create:

| Variable name | Value |
| --- | --- |
| `JOBLY_ANDROID_RELEASE_ENABLED` | `true` |

Do not enable release builds until all five secrets are saved correctly.

## 4. Protect and back up the keystore

The private file is:

`%USERPROFILE%\Jobly-Android-Signing\jobly-release.p12`

Keep at least one additional backup on encrypted offline storage. Do not put it in the Git repository, email, chat, or a CI build artifact. The public `.der` certificate and its SHA-256 fingerprint are not private keys.

## 5. Report completion safely

Tell the project maintainer only:
- the printed SHA-256 fingerprint;
- that all five GitHub Actions secrets were saved;
- that the repository variable was enabled.

Never send the `.p12` file or either password.
