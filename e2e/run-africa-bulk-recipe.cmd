@echo off
setlocal
cd /d "%~dp0.."
if not exist artifacts\e2e mkdir artifacts\e2e
node --test scripts\runtime-readonly-lots.test.mjs > artifacts\e2e\africa-bulk-recipe-process.log 2>&1
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto finish
deno run --allow-read="%USERPROFILE%\Jobly","%CD%" --allow-write="%CD%\artifacts\e2e" --allow-net=ofqqrryamslxoqkklraw.supabase.co,registry.npmjs.org e2e\africa-bulk-recipe.ts "%USERPROFILE%\Jobly" >> artifacts\e2e\africa-bulk-recipe-process.log 2>&1
set "RC=%ERRORLEVEL%"
:finish
echo EXIT_CODE=%RC%>> artifacts\e2e\africa-bulk-recipe-process.log
type artifacts\e2e\africa-bulk-recipe-process.log
if exist artifacts\e2e\africa-bulk-recipe-report.json (start "" notepad "%CD%\artifacts\e2e\africa-bulk-recipe-report.json") else (start "" notepad "%CD%\artifacts\e2e\africa-bulk-recipe-process.log")
exit /b %RC%
