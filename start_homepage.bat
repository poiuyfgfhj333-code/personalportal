@echo off
chcp 65001 > nul
title 개인 포털 대시보드 (My Portal)
echo =========================================================
echo   개인 통합 포털 대시보드 (Home, Site, Course) 시작 중...
echo =========================================================
echo.

cd /d "%~dp0"

echo [1/2] 필수 패키지 확인 중...
py -m pip install -q -r requirements.txt

echo [2/2] 대시보드 웹 서버 시작 중...
start "" http://127.0.0.1:5000
py app.py

pause
