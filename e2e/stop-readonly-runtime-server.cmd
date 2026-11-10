@echo off
setlocal
cd /d "%~dp0.."
node e2e\stop-readonly-runtime-server.mjs > artifacts\e2e\parallel-runtime-server-stop-process.log 2>&1
set "RC=%ERRORLEVEL%"
type artifacts\e2e\parallel-runtime-server-stop-process.log
if exist artifacts\e2e\parallel-runtime-server-stop.json (start "" notepad "%CD%\artifacts\e2e\parallel-runtime-server-stop.json") else (start "" notepad "%CD%\artifacts\e2e\parallel-runtime-server-stop-process.log")
exit /b %RC%
