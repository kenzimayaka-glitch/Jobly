@echo off
setlocal EnableExtensions
title Jobly - Recette bulk Afrique
set "ROOT=%USERPROFILE%\Jobly-e2e-recette-lot01"
set "BOOTDIR=%TEMP%\jobly-africa-bulk-bootstrap"
set "BOOTPS1=%BOOTDIR%\run-africa-bulk-isolated.ps1"
set "BOOTLOG=%TEMP%\jobly-africa-bulk-bootstrap.log"
set "REMOTEFILE=%TEMP%\jobly-africa-origin.txt"
set "SHA="

> "%BOOTLOG%" echo JOBLY AFRICA BULK BOOTSTRAP
echo [1/5] Verification du depot local...
echo [1/5] Verification du depot local...>> "%BOOTLOG%"
if not exist "%ROOT%\.git" goto no_repo

git -C "%ROOT%" remote get-url origin > "%REMOTEFILE%" 2>nul
if errorlevel 1 goto no_origin
set /p "ORIGIN="<"%REMOTEFILE%"
echo ORIGIN=%ORIGIN%
echo ORIGIN=%ORIGIN%>> "%BOOTLOG%"
if /i not "%ORIGIN%"=="https://github.com/kenzimayaka-glitch/Jobly" if /i not "%ORIGIN%"=="https://github.com/kenzimayaka-glitch/Jobly.git" if /i not "%ORIGIN%"=="git@github.com:kenzimayaka-glitch/Jobly.git" goto wrong_origin

if /i "%~1"=="FETCH_HEAD" goto resolve_fetch_head
if not "%~1"=="" goto use_argument_sha

echo [2/5] Recuperation de la branche distante e2e/recette...
echo [2/5] FETCH origin e2e/recette>> "%BOOTLOG%"
git -C "%ROOT%" fetch --no-tags origin refs/heads/e2e/recette
set "RC=%ERRORLEVEL%"
echo FETCH_EXIT_CODE=%RC%
echo FETCH_EXIT_CODE=%RC%>> "%BOOTLOG%"
if not "%RC%"=="0" goto fetch_failed

for /f "delims=" %%H in ('git -C "%ROOT%" rev-parse FETCH_HEAD 2^>nul') do set "SHA=%%H"
goto sha_ready

:resolve_fetch_head
echo [2/5] Reutilisation du FETCH_HEAD deja recupere...
for /f "delims=" %%H in ('git -C "%ROOT%" rev-parse FETCH_HEAD 2^>nul') do set "SHA=%%H"
goto sha_ready

:use_argument_sha
echo [2/5] Reutilisation du SHA fourni...
set "SHA=%~1"

:sha_ready
if not defined SHA goto sha_failed
if "%SHA:~39,1%"=="" goto sha_failed
if not "%SHA:~40,1%"=="" goto sha_failed
echo FETCH_SHA=%SHA%
echo FETCH_SHA=%SHA%>> "%BOOTLOG%"

echo [3/5] Extraction du lanceur PowerShell depuis le commit exact...
if not exist "%BOOTDIR%" mkdir "%BOOTDIR%"
git -C "%ROOT%" show %SHA%:e2e/run-africa-bulk-isolated.ps1 > "%BOOTPS1%"
set "RC=%ERRORLEVEL%"
echo EXTRACT_PS1_EXIT_CODE=%RC%
echo EXTRACT_PS1_EXIT_CODE=%RC%>> "%BOOTLOG%"
if not "%RC%"=="0" goto extract_failed
if not exist "%BOOTPS1%" goto extract_failed
for %%F in ("%BOOTPS1%") do if %%~zF LSS 1000 goto extract_failed

echo [4/5] Lancement isole du commit %SHA%...
echo [4/5] Lancement PowerShell -File>> "%BOOTLOG%"
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%BOOTPS1%" -WorktreeRoot "%ROOT%" -SourceRoot "%USERPROFILE%\Jobly" -FetchedSha "%SHA%"
set "RC=%ERRORLEVEL%"
echo ISOLATED_EXIT_CODE=%RC%
echo ISOLATED_EXIT_CODE=%RC%>> "%BOOTLOG%"

echo [5/5] Fin. Aucun checkout ni nettoyage du worktree utilisateur.
echo [5/5] Fin.>> "%BOOTLOG%"
if "%RC%"=="0" (echo RECETTE PASS ET NETTOYAGE VERIFIE) else (echo RECETTE NON VALIDEE - examiner le rapport)
goto finish

:no_repo
echo ERREUR : depot absent dans "%ROOT%"
echo ERREUR : depot absent>> "%BOOTLOG%"
set "RC=10"
goto finish

:no_origin
echo ERREUR : remote origin illisible.
echo ERREUR : remote origin illisible>> "%BOOTLOG%"
set "RC=11"
goto finish

:wrong_origin
echo ERREUR : le remote ne correspond pas au depot Jobly attendu.
echo ERREUR : remote inattendu>> "%BOOTLOG%"
set "RC=12"
goto finish

:fetch_failed
echo ERREUR : git fetch a echoue. Code %RC%.
goto finish

:sha_failed
echo ERREUR : FETCH_HEAD ne contient pas un commit SHA valide.
echo ERREUR : FETCH_HEAD invalide>> "%BOOTLOG%"
set "RC=13"
goto finish

:extract_failed
echo ERREUR : impossible d'extraire le lanceur PowerShell versionne.
echo ERREUR : extraction PS1 impossible>> "%BOOTLOG%"
set "RC=14"
goto finish

:finish
echo.
echo Journal bootstrap : "%BOOTLOG%"
echo Appuie sur une touche pour fermer cette fenetre.
start "" notepad "%BOOTLOG%"
pause >nul
exit /b %RC%
