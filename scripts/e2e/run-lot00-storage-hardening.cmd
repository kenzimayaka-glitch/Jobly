@echo off
setlocal EnableExtensions

cd /d "%~dp0\..\.."
set "LOG=feedback-lot00-storage-apply-20261108.txt"
set "EXPECTED_BLOB=53420b691095d9042777cd8773b2fb42163a4d13"
set "SCRIPT=scripts\e2e\lot00-storage-bucket-hardening.mjs"
set "GIT_PATH=scripts/e2e/lot00-storage-bucket-hardening.mjs"

> "%LOG%" echo LOT-00 Storage hardening - JOBLY-E2E only
echo expected_blob=%EXPECTED_BLOB%>>"%LOG%"

if exist "%SCRIPT%" copy /Y "%SCRIPT%" "%TEMP%\lot00-storage-bucket-hardening-before-20261108.mjs" >nul 2>&1

git fetch origin >>"%LOG%" 2>&1
if errorlevel 1 goto fail

git show origin/e2e/recette:%GIT_PATH% > "%SCRIPT%" 2>>"%LOG%"
if errorlevel 1 goto fail

for /f "tokens=*" %%H in ('git hash-object "%SCRIPT%"') do set "LOCAL_BLOB=%%H"
echo local_blob=%LOCAL_BLOB%>>"%LOG%"
if /I not "%LOCAL_BLOB%"=="%EXPECTED_BLOB%" goto fail

node --check "%SCRIPT%" >>"%LOG%" 2>&1
if errorlevel 1 goto fail
echo syntax_check=PASS>>"%LOG%"

set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw"
set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co"

node "%SCRIPT%" --apply-lot00-e2e-storage-hardening >>"%LOG%" 2>&1
if errorlevel 1 goto fail

echo exit_code=0>>"%LOG%"
echo status=PASS>>"%LOG%"
notepad "%LOG%"
exit /b 0

:fail
echo status=BLOCKED_OR_FAIL>>"%LOG%"
notepad "%LOG%"
exit /b 1
