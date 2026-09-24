@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Dependencies are missing. Run 1_install.bat first.
  pause
  exit /b 1
)
call npm.cmd start
if errorlevel 1 pause
