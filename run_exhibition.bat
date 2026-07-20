@echo off
title 디지털환경전시회 로컬 서버
echo =============================================================
echo.
echo   🌿 디지털환경전시회 (Digital Environment Exhibition)
echo.
echo   로컬 웹 서버를 가동합니다...
echo   브라우저 창이 자동으로 열리지 않으면 아래 주소로 접속하세요:
echo   주소: http://localhost:8000
echo.
echo   종료하려면 이 창에서 Ctrl + C를 누르거나 창을 닫으세요.
echo.
echo =============================================================
echo.

:: Open default browser
start "" "http://localhost:8000"

:: Start python server in current directory
python -m http.server 8000

pause
