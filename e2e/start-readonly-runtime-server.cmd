@echo off
setlocal
cd /d "%~dp0.."
if not exist artifacts\e2e mkdir artifacts\e2e
node e2e\start-readonly-runtime-server.mjs "%USERPROFILE%\Jobly"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" echo Serveur runtime non demarre. Consulte artifacts\e2e\parallel-runtime-server.json
if exist artifacts\e2e\parallel-runtime-server.json (start "" notepad "%CD%\artifacts\e2e\parallel-runtime-server.json") else (start "" notepad "%CD%\artifacts\e2e\parallel-runtime-server-process.log")
exit /b %RC%
