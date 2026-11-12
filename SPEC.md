# Twitchnt: equivalencias del manual StreamLab

Conservar React/Vite, Express/Socket.io, PostgreSQL y MediaMTX existentes.
No introducir node-media-server ni reemplazar la base de datos.

1. Registro y acceso JWT; validar usuario de 3 a 20 caracteres y contraseña de 6 o más.
2. Clave privada disponible únicamente al propietario autenticado. OBS publica en
   `live/usuario?key=clave`; HLS público usa `live/usuario/index.m3u8`.
3. MediaMTX verifica la clave por HTTP. El nombre del usuario no autoriza publicación.
4. Chat autenticado por JWT verificado en el servidor, hasta 300 caracteres,
   intervalo mínimo de 700 ms. Contar conexiones reales, también al cambiar de sala.
5. Seguir/dejar de seguir otros canales, contador persistente y vista Siguiendo.
6. Seis categorías, título y descripción editables; conservar el estilo visual actual.
7. Grabar transmisiones en fMP4 persistente y listar/reproducir VOD al finalizar.
8. Pruebas aisladas de API y sockets, build frontend y prueba RTMP/HLS/VOD real.
9. GitHub sin secretos ni datos; EC2 Ubuntu 24.04 t3.micro con Docker Compose,
   reinicio automático, disco persistente, swap y puertos públicos 80 y 1935.
   SSH solo desde la IP del operador; servicios internos sin puertos públicos.
10. Documentar pasos 1–19, evidencias, actualización y parada/eliminación.

El presupuesto existente satisface el paso 12. El paso 19 se ejecuta según la
preferencia del usuario; eliminar una instancia borra su volumen y VOD.
