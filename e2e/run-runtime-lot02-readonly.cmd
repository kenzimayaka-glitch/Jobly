@echo off
setlocal
cd /d "%~dp0.."
if not exist artifacts\e2e mkdir artifacts\e2e
node e2e\runtime-lot02-readonly.mjs "%USERPROFILE%\Jobly" > artifacts\e2e\lot2-runtime-readonly-process.log 2>&1
set "RC=%ERRORLEVEL%"
echo EXIT_CODE=%RC%>> artifacts\e2e\lot2-runtime-readonly-process.log
type artifacts\e2e\lot2-runtime-readonly-process.log
exit /b %RC%
