@echo off
setlocal EnableExtensions

cd /d "%~dp0\..\.."
set "LOG=feedback-lot00-storage-apply-20261108.txt"
set "EXPECTED_BLOB=4521e64aed66cfb6ce93d1372b1a1b62f29cd84f"
set "SCRIPT=scripts\e2e\lot00-storage-bucket-hardening.mjs"
set "GIT_PATH=scripts/e2e/lot00-storage-bucket-hardening.mjs"
set "CREDENTIAL_LOG=feedback-lot00-storage-credential-diagnostic.txt"
set "CREDENTIAL_SCRIPT=scripts\e2e\lot00-storage-credential-diagnostic.mjs"
set "CREDENTIAL_GIT_PATH=scripts/e2e/lot00-storage-credential-diagnostic.mjs"
set "EXPECTED_CREDENTIAL_BLOB=f100bf22f423a813e0f20f8a65c9025314b095b8"
set "HELPER=scripts\e2e\lot00-storage-access-smoke.mjs"
set "HELPER_GIT_PATH=scripts/e2e/lot00-storage-access-smoke.mjs"
set "EXPECTED_HELPER_BLOB=68e14ba5b1efbf84ee3970a36bb070cc3b4dc558"

> "%LOG%" echo LOT-00 Storage hardening - JOBLY-E2E only
echo expected_blob=%EXPECTED_BLOB%>>"%LOG%"

if exist "%SCRIPT%" copy /Y "%SCRIPT%" "%TEMP%\lot00-storage-bucket-hardening-before-20261108.mjs" >nul 2>&1
if exist "%CREDENTIAL_SCRIPT%" copy /Y "%CREDENTIAL_SCRIPT%" "%TEMP%\lot00-storage-credential-diagnostic-before-20261108.mjs" >nul 2>&1
if exist "%HELPER%" copy /Y "%HELPER%" "%TEMP%\lot00-storage-access-smoke-before-20261108.mjs" >nul 2>&1

git fetch origin >>"%LOG%" 2>&1
if errorlevel 1 goto fail

git show origin/e2e/recette:%GIT_PATH% > "%SCRIPT%" 2>>"%LOG%"
if errorlevel 1 goto fail

for /f "tokens=*" %%H in ('git hash-object "%SCRIPT%"') do set "LOCAL_BLOB=%%H"
echo local_blob=%LOCAL_BLOB%>>"%LOG%"
if /I not "%LOCAL_BLOB%"=="%EXPECTED_BLOB%" goto fail

git show origin/e2e/recette:%CREDENTIAL_GIT_PATH% > "%CREDENTIAL_SCRIPT%" 2>>"%LOG%"
if errorlevel 1 goto fail
for /f "tokens=*" %%H in ('git hash-object "%CREDENTIAL_SCRIPT%"') do set "LOCAL_CREDENTIAL_BLOB=%%H"
echo credential_diagnostic_blob=%LOCAL_CREDENTIAL_BLOB%>>"%LOG%"
if /I not "%LOCAL_CREDENTIAL_BLOB%"=="%EXPECTED_CREDENTIAL_BLOB%" goto fail

git show origin/e2e/recette:%HELPER_GIT_PATH% > "%HELPER%" 2>>"%LOG%"
if errorlevel 1 goto fail
for /f "tokens=*" %%H in ('git hash-object "%HELPER%"') do set "LOCAL_HELPER_BLOB=%%H"
echo storage_access_helper_blob=%LOCAL_HELPER_BLOB%>>"%LOG%"
if /I not "%LOCAL_HELPER_BLOB%"=="%EXPECTED_HELPER_BLOB%" goto fail

node --check "%SCRIPT%" >>"%LOG%" 2>&1
if errorlevel 1 goto fail
node --check "%CREDENTIAL_SCRIPT%" >>"%LOG%" 2>&1
if errorlevel 1 goto fail
node --check "%HELPER%" >>"%LOG%" 2>&1
if errorlevel 1 goto fail
echo syntax_check=PASS>>"%LOG%"

node "%CREDENTIAL_SCRIPT%" >>"%LOG%" 2>&1
if errorlevel 1 goto fail

set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw"
set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co"

node "%SCRIPT%" --apply-lot00-e2e-storage-hardening >>"%LOG%" 2>&1
if errorlevel 1 goto fail

echo exit_code=0>>"%LOG%"
echo status=PASS>>"%LOG%"
notepad "%CREDENTIAL_LOG%"
notepad "%LOG%"
exit /b 0

:fail
echo status=BLOCKED_OR_FAIL>>"%LOG%"
if exist "%CREDENTIAL_LOG%" notepad "%CREDENTIAL_LOG%"
notepad "%LOG%"
exit /b 1
