@echo off
title Twitchnt - Docker Compose
echo ========================================================
echo     TWITCHNT - AMBIENTE COMPLETO DOCKER COMPOSE
echo ========================================================
echo.
echo Iniciando PostgreSQL, MediaMTX, Backend y Frontend...
docker compose up --build -d

echo.
echo Esperando inicializacion de servicios...
timeout /t 5 /nobreak >nul

echo Abriendo navegador en http://localhost:3000...
start http://localhost:3000

echo.
echo ========================================================
echo   Plataforma ejecutandose en contenedores Docker!
echo   Frontend: http://localhost:3000
echo   RTMP Ingest (OBS): rtmp://localhost:1935/live
echo.
echo   Para detener los contenedores ejecuta:
echo   docker compose down
echo ========================================================
pause
