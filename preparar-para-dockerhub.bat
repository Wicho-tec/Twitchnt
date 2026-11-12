@echo off
setlocal enabledelayedexpansion
title Twitchnt - Preparar y Subir a Docker Hub
echo ===================================================================
echo     TWITCHNT - AUTOMATIZACION DE BUILD Y PUSH A DOCKER HUB
echo ===================================================================
echo.
echo Este script construira las imagenes Docker de Twitchnt,
echo las subira a tu cuenta de Docker Hub y actualizara tus manifiestos K8s.
echo.

set /p DOCKER_USER="Introduce tu nombre de usuario de Docker Hub: "

if "%DOCKER_USER%"=="" (
    echo [ERROR] Debes proporcionar un nombre de usuario de Docker Hub.
    pause
    exit /b 1
)

echo.
echo Verificando sesion de Docker Hub...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no esta en ejecucion. Por favor inicia Docker Desktop.
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo [1/4] Construyendo imagenes Docker con el tag: %DOCKER_USER%/...
echo ===================================================================

echo -> Construyendo Backend...
docker build -t %DOCKER_USER%/twitchnt-backend:latest ./backend
if %errorlevel% neq 0 ( echo Error construyendo Backend & pause & exit /b 1 )

echo -> Construyendo Frontend...
docker build -t %DOCKER_USER%/twitchnt-frontend:latest ./frontend
if %errorlevel% neq 0 ( echo Error construyendo Frontend & pause & exit /b 1 )

echo -> Construyendo MediaMTX Streaming Server...
docker build -t %DOCKER_USER%/twitchnt-mediamtx:latest ./media-server
if %errorlevel% neq 0 ( echo Error construyendo MediaMTX & pause & exit /b 1 )

echo.
echo ===================================================================
echo [2/4] Subiendo imagenes a Docker Hub (docker push)...
echo ===================================================================
echo (Si falla aqui, asegurate de haber ejecutado 'docker login' antes)
echo.

docker push %DOCKER_USER%/twitchnt-backend:latest
docker push %DOCKER_USER%/twitchnt-frontend:latest
docker push %DOCKER_USER%/twitchnt-mediamtx:latest

echo.
echo ===================================================================
echo [3/4] Actualizando referencias de imagenes en manifiestos K8s...
echo ===================================================================

powershell -Command "(Get-Content k8s/04-backend.yaml) -replace 'image: twitchnt-backend:latest', 'image: %DOCKER_USER%/twitchnt-backend:latest' | Set-Content k8s/04-backend.yaml"
powershell -Command "(Get-Content k8s/05-frontend.yaml) -replace 'image: twitchnt-frontend:latest', 'image: %DOCKER_USER%/twitchnt-frontend:latest' | Set-Content k8s/05-frontend.yaml"
powershell -Command "(Get-Content k8s/03-mediamtx.yaml) -replace 'image: bluenviron/mediamtx:latest-alpine', 'image: %DOCKER_USER%/twitchnt-mediamtx:latest' | Set-Content k8s/03-mediamtx.yaml"

echo [OK] Manifiestos K8s actualizados con exito!

echo.
echo ===================================================================
echo [4/4] LISTO PARA DESPLEGAR EN CUALQUIER CLUSTER KUBERNETES
echo ===================================================================
echo.
echo Para desplegar en tu cluster ejecuta:
echo   kubectl apply -k k8s/
echo.
echo Consulta el archivo GUIA_DESPLIEGUE_NUBE.md para las instrucciones cloud.
echo.
pause
