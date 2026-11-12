# ☁️ Guía Paso a Paso: Despliegue de Twitchnt en Kubernetes Cloud

Esta guía explica detalladamente cómo llevar la plataforma **Twitchnt** desde tu máquina local hasta un clúster de **Kubernetes** en la nube (Google Cloud GKE, Microsoft Azure AKS, AWS EKS o clúster local Minikube/Docker Desktop).

---

## 📋 Resumen del Flujo de Despliegue

```
1. Crear cuenta en Docker Hub
2. Ejecutar 'preparar-para-dockerhub.bat' (construye y sube las imágenes)
3. Crear clúster de Kubernetes en el proveedor Cloud elegido
4. Conectar kubectl a dicho clúster
5. Ejecutar 'kubectl apply -k k8s/'
6. Obtener IP pública del Ingress y disfrutar
```

---

## 1️⃣ Paso 1: Subir tus imágenes a Docker Hub

1. Regístrate gratis en **[Docker Hub](https://hub.docker.com/)** si aún no tienes cuenta.
2. Abre tu terminal (CMD o PowerShell) e inicia sesión:
   ```cmd
   docker login
   ```
   Ingresa tu usuario y contraseña (o Personal Access Token).
3. En la carpeta de tu proyecto, haz doble clic en el archivo:
   👉 **`preparar-para-dockerhub.bat`**
   - Te pedirá tu usuario de Docker Hub.
   - Construirá automáticamente las 3 imágenes (`backend`, `frontend` y `mediamtx`).
   - Las subirá con `docker push` a la nube.
   - Modificará automáticamente los archivos YAML de `k8s/` para apuntar a tus nuevas imágenes en la nube.

---

## 2️⃣ Paso 2: Crear el Clúster de Kubernetes en la Nube

Elige **uno** de los siguientes proveedores:

### Opción A: Google Cloud Platform (GKE - Google Kubernetes Engine)
*(Recomendado para la materia de Cómputo en la Nube por facilidad de uso)*

1. Ingresa a la consola de [Google Cloud](https://console.cloud.google.com/).
2. Abre **Cloud Shell** (el ícono de terminal `>_` arriba a la derecha) o usa tu terminal con `gcloud` instalado:
   ```bash
   # Configurar proyecto y zona
   gcloud config set project TU_PROJECT_ID
   gcloud config set compute/zone us-central1-a

   # Habilitar la API de Kubernetes
   gcloud services enable container.googleapis.com

   # Crear clúster (2 nodos de tipo e2-medium para optimizar costos)
   gcloud container clusters create twitchnt-cluster \
       --num-nodes=2 \
       --machine-type=e2-medium \
       --enable-autoscaling --min-nodes=2 --max-nodes=4

   # Obtener credenciales para que tu kubectl local se conecte
   gcloud container clusters get-credentials twitchnt-cluster --zone us-central1-a
   ```

### Opción B: Microsoft Azure (AKS - Azure Kubernetes Service)
```bash
# Crear grupo de recursos
az group create --name TwitchntRG --location eastus

# Crear clúster AKS
az aks create \
    --resource-group TwitchntRG \
    --name twitchnt-cluster \
    --node-count 2 \
    --node-vm-size Standard_B2s \
    --generate-ssh-keys

# Conectar kubectl
az aks get-credentials --resource-group TwitchntRG --name twitchnt-cluster
```

### Opción C: Alternativa Local (Docker Desktop K8s o Minikube)
Si tu profesor permite evaluar el clúster de Kubernetes corriendo en tu máquina:
- En **Docker Desktop**: Ve a *Settings* ⚙️ > *Kubernetes* > Marca **Enable Kubernetes** > *Apply & Restart*.
- ¡Tu `kubectl` ya estará conectado automáticamente!

---

## 3️⃣ Paso 3: Instalar NGINX Ingress Controller en el Clúster

El Ingress Controller asigna la IP pública de internet y enruta el tráfico web, sockets y video:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

Espera unos segundos a que obtenga IP pública:
```bash
kubectl get svc -n ingress-nginx -w
```
*(Cuando la columna `EXTERNAL-IP` muestre una dirección IP en lugar de `<pending>`, cancelas con `Ctrl+C`)*.

---

## 4️⃣ Paso 4: Desplegar Twitchnt en Kubernetes

Desde la raíz del proyecto en tu máquina local:

```bash
kubectl apply -k k8s/
```

### Comprobar el estado del despliegue:
```bash
# Ver que todos los Pods estén en estado 'Running'
kubectl get pods -n twitchnt

# Ver los servicios levantados
kubectl get svc -n twitchnt

# Ver el Ingress y obtener la IP pública asignada a la plataforma
kubectl get ingress -n twitchnt
```

---

## 5️⃣ Paso 5: Probar la Plataforma y Emitir desde OBS

1. **Abrir la web**:
   - En `kubectl get ingress -n twitchnt`, copia la IP que aparece en `ADDRESS` (ejemplo `34.120.45.67`).
   - Abre en tu navegador: `http://34.120.45.67`
2. **Transmitir en vivo a la nube**:
   - Para transmitir con OBS hacia el clúster, obtén el puerto del servicio RTMP:
     ```bash
     kubectl get svc mediamtx-rtmp-service -n twitchnt
     ```
     *(Por defecto expone el puerto `31935`)*.
   - En OBS Studio ve a: **Ajustes** > **Emisión** > Servicio: **Personalizado...**
     - **Servidor**: `rtmp://TU_IP_PUBLICA:31935/live`
     - **Clave**: Tu clave copiada del panel *Studio* de la plataforma.
   - Inicia transmisión y el flujo viajará a través de la nube en tiempo real hacia los espectadores.

---

## 🧹 Limpieza (Para no generar costos en la nube al terminar)

Cuando termines tu presentación o entrega escolar:

- En Google Cloud GKE:
  ```bash
  gcloud container clusters delete twitchnt-cluster --zone us-central1-a
  ```
- En Azure AKS:
  ```bash
  az group delete --name TwitchntRG --yes --no-wait
  ```
