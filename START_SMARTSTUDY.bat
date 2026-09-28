@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing required packages...
  call npm install
)
echo.
echo Starting SmartStudy AI...
echo Open http://localhost:3000 in your browser.
echo Keep this window open while using the website.
echo.
call npm start
pause
