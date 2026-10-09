@echo off
chcp 65001 >nul
title Deploiement Vercel Production - MCPara
cd /d "C:\Users\user\Desktop\MCPara\ecom\ecom"

echo ===============================================================
echo   DEPLOIEMENT VERCEL PRODUCTION
echo ===============================================================
echo.
echo Etape 1/2 : Connexion a Vercel
echo Appuyez sur ENTREE sur 'Continue with GitHub'
echo Une page web va s'ouvrir pour valider la connexion.
echo.
call npx.cmd vercel login

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] Echec de la connexion.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===============================================================
echo Etape 2/2 : Deploiement en Production...
echo ===============================================================
call npx.cmd vercel deploy --prod --yes

echo.
echo ===============================================================
echo   DEPLOIEMENT TERMINE AVEC SUCCES !
echo ===============================================================
pause
