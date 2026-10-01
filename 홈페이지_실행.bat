@echo off
chcp 65001 >nul
title 바이브코딩 개인 포털 대시보드
cd /d "C:\Users\hanna\.gemini\antigravity\scratch\my-homepage"
echo ==================================================
echo   바이브코딩 포털 대시보드 서버를 시작합니다...
echo ==================================================
py app.py
pause

