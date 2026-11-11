@echo off
setlocal EnableExtensions
title Jobly - Recette E2E LOT-01 Auth avancee

cd /d "%~dp0.."
if errorlevel 1 goto :failed

echo.
echo [1/7] Verification du worktree...
set "JOBLY_DIRTY="
for /f "delims=" %%A in ('git status --porcelain') do set "JOBLY_DIRTY=1"
if defined JOBLY_DIRTY (
  echo ERREUR : worktree non propre. Aucun fichier local ne sera ecrase.
  goto :failed
)

echo.
echo [2/7] Recuperation de la branche E2E...
git fetch origin
if errorlevel 1 goto :failed
git checkout --detach origin/e2e/recette
if errorlevel 1 goto :failed

for /f %%A in ('git rev-parse HEAD') do set "JOBLY_HEAD_SHA=%%A"
for /f %%A in ('git rev-parse origin/e2e/recette') do set "JOBLY_BRANCH_SHA=%%A"
if not defined JOBLY_HEAD_SHA goto :failed
if /I not "%JOBLY_HEAD_SHA%"=="%JOBLY_BRANCH_SHA%" (
  echo ERREUR : HEAD different de origin/e2e/recette.
  goto :failed
)
set "JOBLY_EXPECTED_COMMIT=%JOBLY_HEAD_SHA%"
echo SHA source confirme : %JOBLY_EXPECTED_COMMIT%

if not exist artifacts\e2e mkdir artifacts\e2e
if exist artifacts\e2e\lot1-auth-advanced-smoke.json del /q artifacts\e2e\lot1-auth-advanced-smoke.json
if exist artifacts\e2e\auth-advanced-process.log del /q artifacts\e2e\auth-advanced-process.log
if exist artifacts\e2e\auth-advanced-smoke-diagnostic.json del /q artifacts\e2e\auth-advanced-smoke-diagnostic.json
if exist artifacts\e2e\authenticated-role-runner-summary.json del /q artifacts\e2e\authenticated-role-runner-summary.json
if exist artifacts\e2e\lot1-auth-advanced-smoke.json (
  echo ERREUR : impossible de supprimer l'ancien rapport. Arret pour eviter toute confusion.
  goto :failed
)



echo.
echo [3/7] Verification syntaxique des runners...
node --check e2e\auth-advanced-browser-smoke.mjs
if errorlevel 1 goto :failed
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 goto :failed

echo.
echo [4/7] Tests de regression Auth...
call pnpm test:auth
if errorlevel 1 goto :failed

echo.
echo [5/7] Verification TypeScript...
call pnpm exec tsc --noEmit --incremental false
if errorlevel 1 goto :failed

echo.
echo [6/7] Execution de la recette navigateur E2E...

node e2e\run-authenticated-role-recipe.mjs "%USERPROFILE%\Jobly" --auth-advanced-only
set "JOBLY_RUN_EXIT=%ERRORLEVEL%"

echo.
echo [7/7] Verification de la provenance du nouveau rapport...
if not exist artifacts\e2e\lot1-auth-advanced-smoke.json (
  echo ERREUR : aucun nouveau rapport n'a ete genere.
  echo Consulter artifacts\e2e\auth-advanced-process.log et authenticated-role-runner-summary.json.
  goto :failed
)

node -e "const fs=require('fs');const p='artifacts/e2e/lot1-auth-advanced-smoke.json';const r=JSON.parse(fs.readFileSync(p,'utf8'));const ok=r.commit===process.env.JOBLY_EXPECTED_COMMIT&&r.environment==='JOBLY-E2E'&&r.projectRef==='ofqqrryamslxoqkklraw'&&r.baseURL==='http://127.0.0.1:3217'&&r.mode==='auth-advanced-browser';if(!ok){console.error('RAPPORT REFUSE : commit, environnement, projet, URL ou mode incorrect.');process.exit(1)}console.log('Rapport neuf confirme :',r.commit,'| Statut :',r.status)"
if errorlevel 1 goto :failed

echo.
echo Rapport valide : %CD%\artifacts\e2e\lot1-auth-advanced-smoke.json
start "" notepad.exe "%CD%\artifacts\e2e\lot1-auth-advanced-smoke.json"
if "%JOBLY_RUN_EXIT%"=="0" (
  echo.
  echo RECETTE AUTH AVANCEE : PASS
) else (
  echo.
  echo Rapport ouvert dans Notepad. Statut runner non PASS, code : %JOBLY_RUN_EXIT%
)
exit /b %JOBLY_RUN_EXIT%

:failed
echo.
echo RECETTE INTERROMPUE : aucune ouverture d'ancien rapport.
echo Verifier le message d'erreur ci-dessus avant toute nouvelle tentative.
exit /b 1
