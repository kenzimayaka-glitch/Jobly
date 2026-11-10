@echo off
setlocal
cd /d "%~dp0.."
if not exist artifacts\e2e mkdir artifacts\e2e
node --experimental-strip-types e2e\runtime-lot04-readonly.mjs "%USERPROFILE%\Jobly" > artifacts\e2e\lot4-runtime-readonly-process.log 2>&1
set "RC=%ERRORLEVEL%"
echo EXIT_CODE=%RC%>> artifacts\e2e\lot4-runtime-readonly-process.log
type artifacts\e2e\lot4-runtime-readonly-process.log
exit /b %RC%
