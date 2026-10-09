@echo off
cd /d "%~dp0"
title Formula 1 2D Game Server
echo ========================================================
echo        Formula 1 2D Racing - Web Game Server
echo ========================================================
echo.
echo Starting Python web server on http://localhost:8080 ...
echo Close this window when you are done playing.
echo.
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:8080/index.html"
python -m http.server 8080 --bind 127.0.0.1
pause

