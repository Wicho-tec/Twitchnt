# 🎮 Twitchnt — Plataforma de Streaming en Vivo Cloud-Native con Kubernetes

**Twitchnt** es un clon completo de la plataforma de streaming Twitch, desarrollado con arquitectura de microservicios contenerizada y lista para su despliegue y autoescalado en clústeres de **Kubernetes** en la nube.

> **Materia**: Cómputo en la Nube  
> **Institución**: Tecnológico Nacional de México (TecNM)  
> **Semestre**: 3er Semestre

---

## 🚀 Características Principales

- 🔴 **Transmisiones en Vivo (Live Streaming)**: Ingesta de video en alta definición mediante protocolo RTMP (puerto 1935) desde software profesional como **OBS Studio** y transcodificación / entrega en navegador vía **HLS de baja latencia** y WebRTC con **MediaMTX**.
- 📺 **Múltiples Canales y Directorio**: Gestión de múltiples creadores, categorías (*Software & Cloud*, *Gaming*, *Just Chatting*, etc.), metadatos en vivo y estado online/offline.
- 💬 **Chat en Vivo en Tiempo Real**: Salas de chat independientes por canal mediante **WebSockets (Socket.io)**, con mensajes instantáneos, conteo de espectadores en tiempo real y badges de Streamer, Moderador y Admin.
- 🎛️ **Panel de Creador (Creator Studio)**: Generación y administración de claves de transmisión privadas (*Stream Keys*), edición de título y categoría, y simulador de transmisión para pruebas en vivo.
- ☁️ **Cloud Native & Kubernetes Ready**: Manifiestos de Kubernetes completos con Namespaces, ConfigMaps, Secrets, Ingress, servicios ClusterIP/NodePort, almacenamiento persistente (PVC) y autoescalado elástico (**Horizontal Pod Autoscaler - HPA**).

---

## 🏛️ Arquitectura del Sistema

```
                                  +---------------------------+
                                  |     OBS Studio (Streamer) |
                                  +-------------+-------------+
                                                | RTMP (TCP 1935)
                                                v
+-------------------------------------------------------------------------------------------------+
|                                       KUBERNETES CLUSTER                                        |
|                                                                                                 |
|   +-----------------------+                              +----------------------------------+   |
|   |   MediaMTX Server     |-------- HLS / WebRTC ------->|         Ingress Controller       |   |
|   | (RTMP Ingest -> HLS)  |<----- Webhook Auth (200) ----|           (Nginx Ingress)        |   |
|   +-----------+-----------+                              +-----------------+----------------+   |
|               |                                                            |                    |
|               | Segmentos HLS (.m3u8, .ts)                                 |                    |
|               v                                                            v                    |
|   +-----------------------+                              +----------------------------------+   |
|   |    Backend API &      |<========= WebSockets =======>|       Frontend SPA (React)       |   |
|   |    Socket.io Chat     |                              |   (Twitch Dark UI, Player, Chat) |   |
|   +-----------+-----------+                              +----------------------------------+   |
|               |                                                                                 |
|               v                                                                                 |
|   +-----------------------+                                                                     |
|   |   PostgreSQL DB       |                                                                     |
|   | (Stateful PVC 5Gi)    |                                                                     |
|   +-----------------------+                                                                     |
|                                                                                                 |
|   [Horizontal Pod Autoscaler (HPA)]: Escala Backend y Frontend de 2 a 10 réplicas por CPU       |
+-------------------------------------------------------------------------------------------------+
```

---

## 📁 Estructura del Proyecto

```
Twitchnt/
├── backend/                  # Microservicio API REST & WebSockets
│   ├── src/
│   │   ├── routes/           # auth, channels, mediamtx webhooks
│   │   ├── sockets/          # Socket.io chat en vivo por salas de canal
│   │   ├── db.js             # Capa de datos PostgreSQL con fallback local
│   │   └── server.js         # Servidor HTTP Express & Socket.io
│   ├── Dockerfile            # Imagen Node.js 20 Alpine optimizada
│   └── package.json
├── frontend/                 # Interfaz de usuario clon de Twitch
│   ├── src/
│   │   ├── components/       # VideoPlayer (HLS), ChatBox, Navbar, Sidebar
│   │   ├── pages/            # Home, WatchChannel, Studio
│   │   └── context/          # AuthContext (JWT & Estado)
│   ├── nginx.conf            # Servidor web Nginx para la SPA
│   ├── Dockerfile            # Multi-stage build con Nginx Alpine
│   └── package.json
├── media-server/             # Motor de Streaming MediaMTX
│   ├── mediamtx.yml          # Ingesta RTMP 1935, egreso HLS 8888, Webhook auth
│   └── Dockerfile
├── k8s/                      # Manifiestos completos de Kubernetes
│   ├── 00-namespace.yaml     # Namespace dedicado 'twitchnt'
│   ├── 01-secrets-config.yaml# ConfigMaps y Secrets (claves, JWT, DB)
│   ├── 02-postgres.yaml      # PersistentVolumeClaim (5Gi) + Deployment + Service
│   ├── 03-mediamtx.yaml      # Deployment + NodePort 31935 (RTMP) + ClusterIP (HLS)
│   ├── 04-backend.yaml       # Deployment (2 réplicas HA) + Health Probes + Service
│   ├── 05-frontend.yaml      # Deployment (2 réplicas HA) + Health Probes + Service
│   ├── 06-ingress.yaml       # Enrutamiento unificado de tráfico HTTP/WS
│   ├── 07-hpa.yaml           # Autoescalado horizontal elástico (HPA)
│   └── kustomization.yaml    # Configuración Kustomize
├── docker-compose.yml        # Orquestación multi-contenedor para pruebas locales
└── README.md
```

---

## 🛠️ Requisitos Previos

- **Node.js** v18+ y **npm**
- **Docker** y **Docker Compose**
- **kubectl** (opcional para Kubernetes: Minikube, Docker Desktop K8s, Kind o clúster en la nube)
- **OBS Studio** (para transmitir video en vivo)

---

## ⚡ Guía de Inicio Rápido (Local con Docker Compose)

Para levantar todos los microservicios con un solo comando:

```bash
docker compose up --build
```

Una vez levantado:
- 🌐 **Frontend (Plataforma Web)**: [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend API REST**: [http://localhost:5000/api](http://localhost:5000/api)
- 🩺 **Health Check API**: [http://localhost:5000/health](http://localhost:5000/health)
- 📡 **Servidor RTMP (OBS)**: `rtmp://localhost:1935/live`
- 📺 **Transmisión HLS**: `http://localhost:8888/live/<streamKey>/index.m3u8`

---

## 🖥️ Cómo Transmitir en Vivo con OBS Studio

1. Abre **Twitchnt** en tu navegador ([http://localhost:3000](http://localhost:3000)).
2. Haz clic en **Iniciar Sesión** e ingresa con una de las cuentas de prueba:
   - **Usuario**: `cloud_streamer` | **Contraseña**: `password123`
   - O crea tu propia cuenta con un clic.
3. Entra a **Panel de Control (Studio)**:
   - Copia la **URL del Servidor RTMP**: `rtmp://localhost:1935/live`
   - Copia tu **Clave de Transmisión (Stream Key)** (ej: `live_streamkey_cloud_123`).
4. Abre **OBS Studio** en tu computadora:
   - Ve a **Ajustes** &gt; **Emisión**.
   - En *Servicio*, selecciona **Personalizado...**.
   - En *Servidor*, pega: `rtmp://localhost:1935/live`
   - En *Clave de retransmisión*, pega tu clave.
   - Presiona **Aceptar** y luego haz clic en **Iniciar transmisión** en OBS.
5. Vuelve al navegador: ¡Tu canal cambiará a estado **EN VIVO 🔴** y tu transmisión se reproducirá con baja latencia mientras interactúas en el chat en tiempo real!

> 💡 **Nota para presentaciones**: Si no tienes OBS a la mano en el momento de evaluar, en la esquina superior del canal y en el Studio hay un botón **"Simular EN VIVO"** que activa y desactiva el estado de transmisión de forma instantánea.

---

## ☁️ Despliegue en la Nube con Kubernetes (K8s)

Los manifiestos en la carpeta `k8s/` están listos para desplegar en cualquier clúster de Kubernetes (**GKE en Google Cloud, AKS en Azure, EKS en AWS, o local con Minikube / Docker Desktop**):

### 1. Construir o etiquetar las imágenes Docker:
```bash
docker build -t twitchnt-backend:latest ./backend
docker build -t twitchnt-frontend:latest ./frontend
docker build -t twitchnt-mediamtx:latest ./media-server
```

*(Si usas Minikube, ejecuta primero `eval $(minikube docker-env)` para construir directo en el clúster).*

### 2. Aplicar los manifiestos en el clúster:
```bash
kubectl apply -k k8s/
```
O archivo por archivo:
```bash
kubectl apply -f k8s/
```

### 3. Verificar los recursos desplegados:
```bash
# Ver los Pods en ejecución (Backend, Frontend, Postgres, MediaMTX)
kubectl get pods -n twitchnt

# Ver los Servicios y puertos expuestos (incluyendo NodePort 31935 para OBS)
kubectl get svc -n twitchnt

# Ver el estado del Ingress
kubectl get ingress -n twitchnt

# Ver el autoescalado elástico HPA
kubectl get hpa -n twitchnt
```

### 4. Conexión de OBS al clúster de Kubernetes:
- La ingesta RTMP está expuesta mediante el servicio `mediamtx-rtmp-service` en el puerto `31935`.
- Configura en OBS Studio:
  - Servidor: `rtmp://<IP-DEL-NODO-O-CLUSTER>:31935/live`
  - Clave: Tu clave de transmisión.

---

## 👥 Cuentas de Demostración Pre-Cargadas

| Usuario | Nombre Visible | Categoría Principal | Contraseña |
|---|---|---|---|
| `cloud_streamer` | Cloud Streamer MX | Software & Game Development | `password123` |
| `tecnm_gaming` | TecNM Gaming Hub | Gaming | `password123` |
| `chill_coder` | Chill Coder Lo-Fi | Just Chatting | `password123` |

---

## 🛡️ Justificación para Cómputo en la Nube

1. **Microservicios Desacoplados**: La ingesta de medios (MediaMTX en Go), la lógica de negocio y chat (Node.js/Socket.io), el frontend (React/Nginx) y la persistencia (PostgreSQL) operan en contenedores aislados comunicados por DNS interno de Kubernetes.
2. **Elasticidad y Escalabilidad (HPA)**: Se incluye `HorizontalPodAutoscaler` para aumentar dinámicamente las réplicas del Backend y Frontend ante picos de demanda.
3. **Persistencia Cloud**: Uso de `PersistentVolumeClaim` (PVC) para desacoplar el ciclo de vida de los datos del ciclo de vida de los Pods.
4. **Resiliencia y Monitoreo**: `readinessProbe` y `livenessProbe` configurados para autorecuperación automática ante fallos.
