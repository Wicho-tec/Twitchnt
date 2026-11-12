@echo off
title Twitchnt - Servidores Locales (Sin Docker)
echo ========================================================
echo       TWITCHNT - SERVIDOR LOCAL DE PRUEBAS
echo ========================================================
echo.
echo [1/4] Iniciando Backend API y Chat en tiempo real (puerto 5000)...
start "Twitchnt Backend" cmd /k "cd backend && node src/server.js"

timeout /t 2 /nobreak >nul

echo [2/4] Iniciando Servidor de Streaming MediaMTX (RTMP 1935, HLS 8888)...
if exist "media-server\mediamtx.exe" (
    start "Twitchnt Media Server" cmd /k "cd media-server && mediamtx.exe mediamtx-local.yml"
) else (
    echo [AVISO] mediamtx.exe no encontrado en media-server. Para OBS instala o usa Docker.
)

timeout /t 2 /nobreak >nul

echo [3/4] Iniciando Frontend React + Vite (puerto 3000)...
start "Twitchnt Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo [4/4] Abriendo navegador en http://localhost:3000...
start http://localhost:3000

echo.
echo ========================================================
echo   Plataforma iniciada exitosamente!
echo   - Web: http://localhost:3000
echo   - OBS Servidor RTMP: rtmp://localhost:1935/live
echo   - OBS Clave: usuario?key=CLAVE_PRIVADA (copiar desde Studio)
echo.
echo   Para detener los servidores, cierra las ventanas de CMD.
echo ========================================================
pause
