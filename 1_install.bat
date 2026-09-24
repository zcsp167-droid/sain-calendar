@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js and npm are required. Install Node.js, then try again.
  pause
  exit /b 1
)
echo Installing dependencies. This may take a few minutes.
call npm.cmd install
if errorlevel 1 (
  echo Installation failed. See the error above.
  pause
  exit /b 1
)
echo Installation complete. Run 2_run.bat.
pause
