@echo off
setlocal
cd /d "%~dp0.."
node e2e\stop-readonly-runtime-server.mjs
set "RC=%ERRORLEVEL%"
exit /b %RC%
