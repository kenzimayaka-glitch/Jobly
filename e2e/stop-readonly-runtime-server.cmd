@echo off
setlocal
cd /d "%~dp0.."
node e2e\stop-readonly-runtime-server.mjs
set "RC=%ERRORLEVEL%"
start "" notepad "%CD%\artifacts\e2e\parallel-runtime-server-stop.json"
exit /b %RC%
