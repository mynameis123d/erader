@echo off
REM Double-click to start Blitz on Windows. First run installs everything.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
if not exist node_modules (call npm run setup || (pause & exit /b 1))
if not exist web\dist (call npm run build)
start "" http://localhost:8787
call npm start
pause
