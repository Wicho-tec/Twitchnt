# Twitchnt: ejecución del manual StreamLab

La aplicación conserva los equivalentes del proyecto: React/Vite en lugar de HTML
estático; Express y JWT; PostgreSQL en lugar de SQLite; MediaMTX en lugar de
node-media-server. Docker Compose mantiene los cuatro servicios en una sola EC2,
sin clúster, balanceador, RDS ni NAT Gateway.

## Arranque local

Se requiere Docker Desktop. Si es la primera instalación, copia `.env.example` a
`.env` y sustituye ambas contraseñas por cadenas aleatorias. Si ya existe el volumen
PostgreSQL, conserva su contraseña; cambiar solo `.env` no cambia la contraseña del
volumen existente. No uses `docker compose down -v` si deseas conservar tus datos.

```powershell
docker compose up -d --build
```

Abre http://localhost:3000 y registra tu propia cuenta. En Studio, copia:

- Servidor: `rtmp://localhost:1935/live`
- Clave OBS completa: `usuario?key=clave_privada`

OBS: H.264, audio AAC, intervalo de fotogramas clave 2 segundos, 1280×720 a 30 FPS,
2500 Kbps. La clave anterior deja de autorizar conexiones nuevas al regenerarla.
Una conexión ya autorizada sigue activa hasta que el emisor se desconecte.

El vídeo público usa `/hls/live/usuario/index.m3u8`, sin secretos. Los MP4 quedan
en `recordings/live/usuario/` y aparecen en Videos anteriores al finalizar la emisión.
Las miniaturas se renuevan cada 30 segundos. La grabación usa fMP4 nativo de
MediaMTX; no recodifica el vídeo. No hay borrado automático: revisa espacio en disco.

## Correspondencia de pasos

| Manual | Equivalente aplicado |
|---|---|
| 1 | Dependencias existentes de backend y frontend; Dockerfiles |
| 2 | `SPEC.md` |
| 3 | `backend/src/db.js`: PostgreSQL y almacenamiento JSON local |
| 4 | Rutas auth/channels, claves privadas, descripción y seguidores |
| 5 | Socket.io autenticado, anti-spam, espectadores, MediaMTX HTTP auth |
| 6 | Componentes React y estilos Tailwind existentes |
| 7 | Home: seis categorías, búsqueda y Siguiendo |
| 8 | WatchChannel: HLS, chat, seguidores, descripción y VOD |
| 9 | LoginModal y Studio: acceso, metadatos y clave OBS regenerable |
| 10 | Pruebas aisladas, tres emisiones reales de ffmpeg y navegador |
| 11 | Repositorio privado `https://github.com/Wicho-tec/Twitchnt` |
| 12 | Sesión AWS existente y presupuesto Zero-Spend existente |
| 13 | PowerShell evita conversiones MSYS y retornos CR de Git Bash |
| 14–15 | `deploy/aws.ps1`: llave, firewall, Ubuntu 24.04, EC2 t3.micro |
| 16 | `deploy/setup-ec2.sh`: Docker, swap y arranque persistente |
| 17 | Prueba de la URL pública con RTMP/HLS, chat y VOD |
| 18 | Archivo Git del código y actualización por SSH/SCP |
| 19 | Eliminar EC2, volumen, firewall y llave según autorización |

## Pruebas reproducibles

Instala dependencias locales si faltan: `npm --prefix backend ci` y
`npm --prefix frontend ci`. Las pruebas aisladas crean una base temporal; no alteran
la base del usuario. Se necesita ffmpeg en PATH para la prueba de vídeo.

```powershell
npm --prefix backend test
npm --prefix frontend run build
node backend/tests/streaming.test.js
```

La última prueba dura cerca de un minuto. Crea tres cuentas de prueba en el entorno
objetivo y conserva sus grabaciones como evidencia. Usa vídeo sintético, no cámara
ni pantalla. No elimina cuentas existentes.

```powershell
$env:TEST_BASE_URL='http://IP_PUBLICA'
node backend/tests/streaming.test.js
Remove-Item Env:TEST_BASE_URL
```

## EC2: crear, instalar, actualizar y eliminar

Ejecuta desde la raíz del proyecto. Usa la sesión de AWS CLI; nunca guardes sus
credenciales en el repositorio. Antes de crear otra instancia, conserva o retira el
estado de una ejecución anterior solo después de confirmar que sus recursos fueron
eliminados. El estado local está ignorado por Git.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/aws.ps1 -Action create
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/aws.ps1 -Action status
$state = Get-Content deploy/aws-state.json -Raw | ConvertFrom-Json
git archive -o tmp/twitchnt.tar.gz HEAD
ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=deploy/known_hosts -i deploy/twitchnt-key.pem "ubuntu@$($state.IP)" 'mkdir -p ~/Twitchnt'
scp -o UserKnownHostsFile=deploy/known_hosts -i deploy/twitchnt-key.pem tmp/twitchnt.tar.gz "ubuntu@$($state.IP):/home/ubuntu/Twitchnt/source.tar.gz"
ssh -o UserKnownHostsFile=deploy/known_hosts -i deploy/twitchnt-key.pem "ubuntu@$($state.IP)" 'cd ~/Twitchnt && tar -xzf source.tar.gz && rm source.tar.gz && bash deploy/setup-ec2.sh'
```

Para actualizar, repite archive/SCP/SSH después de probar, hacer commit y subir el
cambio a GitHub. El archivo no incluye `.env`, base de datos, llaves ni VOD. Esto
evita guardar un token personal de GitHub en EC2 para clonar el repositorio privado.

El arranque crea secretos de producción aleatorios y desactiva cuentas demo. Docker
se inicia con systemd y cada servicio usa `restart: unless-stopped`. La web publica
80 y RTMP 1935; SSH 22 acepta solo la IP del operador. PostgreSQL, backend, HLS y API
administrativa se publican exclusivamente en loopback; Nginx sirve vídeo y API.
Se exige IMDSv2; EBS está cifrado y se elimina con la instancia; T3 usa créditos
standard para evitar cobro por créditos excedentes.

```powershell
# Pausar/reanudar para otra práctica (al reanudar puede cambiar la IP).
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/aws.ps1 -Action stop
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/aws.ps1 -Action start

# Borrado definitivo de la instancia, datos, firewall y llave de esta práctica.
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/aws.ps1 -Action delete
```

No se elimina el presupuesto previo ni recursos ajenos. La práctica usa HTTP como
el manual; antes de uso real, configura dominio y HTTPS. No uses contraseñas
personales en una práctica HTTP. Kubernetes queda como alternativa anterior y no
forma parte del despliegue EC2 probado.

Referencias oficiales: [MediaMTX 1.9.3](https://github.com/bluenviron/mediamtx/blob/v1.9.3/mediamtx.yml),
[grabación](https://mediamtx.org/docs/features/record),
[EC2 RunInstances](https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html).
