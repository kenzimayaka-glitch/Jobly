@echo off
setlocal
cd /d "%~dp0.."
if not exist artifacts\e2e mkdir artifacts\e2e
node e2e\run-global-readonly-recipe.mjs "%USERPROFILE%\Jobly" > artifacts\e2e\global-e2e-process.log 2>&1
set "RC=%ERRORLEVEL%"
type artifacts\e2e\global-e2e-process.log
start "" notepad "%CD%\artifacts\e2e\global-e2e-report.md"
echo EXIT_CODE=%RC%>> artifacts\e2e\global-e2e-process.log
exit /b %RC%
