"""Build the five-page practice report from recorded evidence; no AWS mutations."""
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidencias'
OUTPUT = ROOT / 'output/pdf/Reporte_StreamLab_Twitchnt.pdf'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold', 'C:/Windows/Fonts/arialbd.ttf'))
W, H = A4
INK = colors.HexColor('#172033')
PURPLE = colors.HexColor('#713de8')
MUTED = colors.HexColor('#526078')
style = ParagraphStyle('body', fontName='Arial', fontSize=9.3, leading=13.5, textColor=INK)
small = ParagraphStyle('small', parent=style, fontSize=8, leading=11)
c = canvas.Canvas(str(OUTPUT), pagesize=A4)
c.setTitle('Twitchnt - Reporte de práctica StreamLab en AWS')
c.setAuthor('Proyecto Twitchnt')

def load(name):
    raw = (EVIDENCE / name).read_bytes()
    return json.loads(raw.decode('utf-16' if raw.startswith(b'\xff\xfe') else 'utf-8-sig'))

def page(number, title, subtitle):
    c.setFillColor(PURPLE)
    c.rect(0, H-12, W, 12, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont('ArialBold', 21)
    c.drawString(42, H-57, title)
    c.setFillColor(MUTED)
    c.setFont('Arial', 9)
    c.drawString(42, H-76, subtitle)
    c.setStrokeColor(colors.HexColor('#e2e7f0'))
    c.line(42, 37, W-42, 37)
    c.setFont('Arial', 8)
    c.drawString(42, 23, 'Twitchnt / Cómputo en la Nube / 11 noviembre 2026 (México)')
    c.drawRightString(W-42, 23, f'{number} / 5')

def paragraph(text, y, size=style):
    p = Paragraph(text, size)
    _, height = p.wrap(W-84, H)
    assert y-height > 42, 'Content exceeds page'
    p.drawOn(c, 42, y-height)
    return y-height-10

def section(text, y):
    c.setFillColor(PURPLE)
    c.setFont('ArialBold', 11)
    c.drawString(42, y-12, text)
    return y-24

def table(rows, widths, y):
    data = [[Paragraph(escape(str(cell)), small) for cell in row] for row in rows]
    t = Table(data, colWidths=widths, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eee8fc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f6f8fc')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    _, height = t.wrap(W-84, H)
    assert y-height > 42, 'Table exceeds page'
    t.drawOn(c,42,y-height)
    return y-height-12

def picture(name, y, max_height=245):
    file = EVIDENCE / name
    reader = ImageReader(str(file))
    iw, ih = reader.getSize()
    scale = min((W-84)/iw, max_height/ih)
    width, height = iw*scale, ih*scale
    assert y-height > 42
    c.drawImage(reader,42,y-height,width,height)
    return y-height-8

latency = load('latencia-hls.json')
cleanup = load('aws-recursos-eliminados.json')
assert cleanup['InstanceState'] == 'terminated'
assert cleanup['Volumes'] == [] and cleanup['SecurityGroups'] == [] and cleanup['KeyPairs'] == []

page(1, 'Streaming completo sobre AWS', 'Aplicación existente adaptada al manual StreamLab / Pasos 1-19')
y = paragraph('Se completó el flujo de ingesta RTMP, reproducción HLS, chat autenticado, seguidores, miniaturas y grabación VOD. Se desplegó y probó una EC2 real; después se eliminaron sus recursos por instrucción del usuario.', H-103)
y = section('Arquitectura conservada', y)
y = paragraph('<b>OBS / ffmpeg → MediaMTX → HLS / MP4 → React</b><br/>Express + Socket.io gestionan cuentas, chat y canales. PostgreSQL conserva metadatos y seguidores. Nginx reúne web, API, sockets, vídeo y VOD bajo el mismo origen. Los cuatro contenedores corren en una sola EC2 Ubuntu 24.04 t3.micro.', y)
y = table([
    ['Pasos', 'Aplicación en Twitchnt'],
    ['1-3', 'Dependencias existentes, SPEC.md y PostgreSQL; JSON aislado para pruebas locales.'],
    ['4-5', 'API Express, JWT verificado, claves privadas, MediaMTX HTTP auth, chat y audiencia real.'],
    ['6-9', 'React/Tailwind: explorar seis categorías, Siguiendo, canal, VOD, acceso y Studio.'],
    ['10', 'Pruebas de API/sockets, tres señales RTMP simultáneas, HLS, miniaturas y MP4.'],
    ['11', 'Repositorio privado Wicho-tec/Twitchnt con historial; secretos, datos y llaves ignorados.'],
    ['12-13', 'Sesión AWS y presupuesto Zero-Spend existentes; PowerShell evita conversiones MSYS.'],
    ['14-16', 'AWS CLI, llave SSH, firewall, EC2, EBS cifrado 10 GB, Docker, swap y reinicio automático.'],
    ['17-18', 'Pruebas por Internet, actualizaciones por SCP/SSH y persistencia tras reboot.'],
    ['19', 'Instancia terminada; volumen, grupo de seguridad y llave eliminados.'],
], [59, W-143], y)
y = section('Diferencias deliberadas', y)
y = paragraph('React, PostgreSQL y MediaMTX sustituyen los equivalentes del manual sin rehacer el proyecto. Docker Compose sustituye PM2. El repositorio privado se despliega mediante archivos de código, sin dejar un token personal de GitHub en EC2. Kubernetes se conserva como alternativa histórica y no se usó para esta práctica.', y)
paragraph('<b>Repositorio:</b> https://github.com/Wicho-tec/Twitchnt<br/><b>URL usada durante las pruebas:</b> http://3.80.75.49 (retirada al eliminar EC2).', y)
c.showPage()

page(2, 'Evidencia de funcionamiento', 'Capturas reales del navegador contra la IP pública de EC2')
y = section('Tres emisiones simultáneas y descubrimiento', H-101)
y = picture('aws-explorar.png',y,255)
y = paragraph('Señales sintéticas H.264/AAC de ffmpeg; resolución 640×360, 15 FPS y vídeo configurado a 500 Kbps. La prueba final usó audio silencioso. No se capturó pantalla ni cámara del usuario.',y)
y = section('Vídeo real, audiencia y chat', y)
y = picture('aws-en-vivo.png',y,255)
paragraph('La captura muestra el cronómetro incrustado, vídeo en reproducción, chat y audiencia real. La prueba automatizada conecta dos espectadores; el navegador de evidencia agrega otro.',y)
c.showPage()

page(3, 'Verificación y archivo VOD', 'Resultados de pruebas aisladas y prueba pública en AWS')
y = table([
    ['Prueba', 'Resultado comprobado'],
    ['Registro inválido', 'Usuario de un carácter rechazado; límites de contraseña y metadatos validados.'],
    ['Clave RTMP', 'Clave incorrecta rechazada; usuario público o clave de otro canal no autorizan publicación.'],
    ['Seguridad de URLs', 'La API pública y las URLs HLS no contienen claves privadas.'],
    ['Chat', 'Dos usuarios reciben mensajes; JWT evita suplantación; anónimos y spam rechazados.'],
    ['Espectadores', 'Conteo de conexiones al entrar, salir y desconectarse; sin cantidades ficticias.'],
    ['Seguidores', 'Seguir/dejar de seguir, contador, lista Siguiendo y rechazo de autoseguimiento.'],
    ['Regeneración', 'Clave previa deja de autorizar nuevas publicaciones.'],
    ['Vídeo y VOD', 'Tres canales HLS, miniaturas JPEG, desconexión y MP4 servido con HTTP Range 206.'],
    ['Persistencia', 'Reinicio EC2 recuperó servicios, cuentas, seguidores y grabación de 89,979 s.'],
], [105,W-189], H-105)
y = section('Reproducción de la grabación en AWS',y)
y = picture('aws-vod.png',y,240)
paragraph('ffprobe: 5.773.684 bytes, duración 89,979 s, bitrate total 513.336 bit/s. El navegador reprodujo el MP4; las pruebas comprobaron lectura parcial de 1.024 bytes. Evidencias y comandos reproducibles se guardan en el repositorio.',y)
c.showPage()

page(4, 'Latencia y reflexión técnica', 'Mediciones de la práctica y análisis del flujo de vídeo')
y = section('1. Retraso observado en HLS',H-103)
values = ', '.join(f'{n:.2f}' for n in latency['samples_seconds'])
y = paragraph(f'Muestras (s): <b>{values}</b>. Media: <b>{latency["mean_seconds"]:.2f} s</b>; desviación estándar muestral: <b>{latency["sample_stddev_seconds"]:.2f} s</b>. Segmentos de 2 s.',y)
y = paragraph('Método: marcas EXT-X-PROGRAM-DATE-TIME del segmento descargado, reloj HTTP Date del mismo servidor y distancia buffered.end − currentTime. Es una estimación del retraso HLS, con resolución de reloj de 1 s; no equivale a medir cámara/OBS frente a un cronómetro físico. Se evitó mezclar relojes cliente/servidor desfasados. La comparación experimental con segmentos de 1 y 4 s queda pendiente; en teoría, segmentos menores reducen espera y aumentan solicitudes.',y)
y = section('2. Por qué no se recodifica',y)
y = paragraph('La señal de entrada ya contiene H.264/AAC compatibles con el navegador. MediaMTX cambia el empaquetado y conserva los códecs. Generar 1080p, 720p y 480p exige decodificar y volver a codificar; elevaría mucho CPU y memoria. No se probó transcodificación en la t3.micro, ni se afirma que soporte esas tres calidades.',y)
y = section('3. Transferencia para dos horas',y)
rows = [['Espectadores','Salida con bitrate medido','Costo ilustrativo de salida']]
for count in [50,500,5000]:
    gb=513336*7200*count/8/1e9
    rows.append([f'{count:,}',f'{gb:.2f} GB',f'USD {max(0,gb-100)*0.09:.2f}'])
y = table(rows,[99,177,W-360],y)
y = paragraph('Modelo ilustrativo: 0,513336 Mbps medidos; primeros 100 GB mensuales disponibles y USD 0,09/GB después, referencia EC2 US East. Excluye sobrecarga, cómputo, IPv4, almacenamiento e impuestos. La franquicia es compartida por la cuenta. No es el costo final de la práctica. CDN conviene al crecer audiencia y distribución geográfica; el punto económico exige comparar tarifas y tasa de caché.',y)
y = section('4. Contenido, comunidad y datos',y)
y = paragraph('Una emisión generó un MP4 persistente de casi 90 s. El chat permitió interacción entre cuentas y seguir el canal creó una relación persistente. La audiencia concurrente y mensajes fechados aportan datos; no se añadió un panel estadístico ajeno al alcance.',y)
y = section('5. Riesgo de publicar la clave',y)
paragraph('Una clave en una URL pública puede terminar en historiales, registros y enlaces compartidos. Un tercero podría emitir como el creador. Se usa usuario en el HLS público; la clave se valida por separado y solo se entrega al propietario autenticado.',y)
c.showPage()

page(5, 'Cierre, costos y entrega', 'Recursos retirados por autorización expresa del usuario')
y = section('Evidencia consultada directamente con AWS CLI',H-103)
y = table([
    ['Recurso','Estado verificado'],
    ['EC2 i-06b8d4f14242ff2b5',cleanup['InstanceState']],
    ['EBS vol-098e2a927ded3f3d0','Sin resultados en DescribeVolumes'],
    ['Grupo sg-0f0e8d4597ad39700','Sin resultados en DescribeSecurityGroups'],
    ['Llave twitchnt-20261111191102','Sin resultados en DescribeKeyPairs; archivo PEM retirado'],
], [235,W-319],y)
y = paragraph('El JSON original de comprobación se conserva en evidencias/aws-recursos-eliminados.json. Esta tabla reproduce una consulta real de AWS CLI; no es una captura de la consola web. No se borró el presupuesto existente ni recursos ajenos a la práctica.',y)
y = section('Costo registrado y alcance de la cifra',y)
y = paragraph('<b>AWS Cost Explorer registró USD 0,00, Estimated=true</b> para 12 noviembre 2026 UTC al consultar. Es un valor provisional de toda la cuenta, no una factura final ni atribución exclusiva a este despliegue. Los cargos de la sesión pueden aparecer después; se conserva la respuesta original. No se asegura que la práctica haya sido gratuita.',y)
y = section('Uso de IA y trazabilidad',y)
y = paragraph('Una solicitud principal: ejecutar el manual sobre el proyecto existente. Dos decisiones de alcance del usuario: crear repositorio y eliminar EC2 al terminar. Se escribió SPEC.md y se implementaron incrementos con pruebas de API, sockets, contenedores y navegador. La consulta posterior sobre zumbido permitió identificar y retirar el tono sintético de prueba.',y)
y = section('Entrega y reproducción',y)
y = paragraph('<b>Código:</b> github.com/Wicho-tec/Twitchnt (privado).<br/><b>Guía:</b> GUIA_MANUAL_AWS.md.<br/><b>Pruebas:</b> npm --prefix backend test; node backend/tests/streaming.test.js.<br/><b>Despliegue:</b> deploy/aws.ps1 y deploy/setup-ec2.sh.<br/><b>Datos locales:</b> conservados; web local http://localhost:3000.',y)
y = section('Límites que debe conocer el evaluador',y)
y = paragraph('La URL AWS dejó de funcionar después del borrado solicitado; para revisión en vivo hay que crear otra instancia. No se probó desde un teléfono con datos móviles ni OBS físico. Falta comparación experimental HLS 1/4 s y costo definitivo de facturación. La práctica usa HTTP. npm audit detectó un aviso moderado previo en uuid; no se forzó una migración mayor. El build frontend pasa, con advertencia de tamaño de bundle.',y)
paragraph('Fuentes: manual local StreamLab; configuración oficial MediaMTX v1.9.3; docs de EC2 RunInstances; aws.amazon.com/ec2/pricing/on-demand/. Las evidencias distinguen resultados medidos, estimaciones y puntos pendientes.',y,small)
c.showPage()
c.save()

import pymupdf
doc = pymupdf.open(OUTPUT)
assert len(doc) == 5
for index,p in enumerate(doc):
    assert p.get_text().strip()
    p.get_pixmap(matrix=pymupdf.Matrix(1,1)).save(str(ROOT / 'tmp' / f'reporte-pagina-{index+1}.png'))
print(f'Reporte generado: {OUTPUT} / {len(doc)} páginas')
