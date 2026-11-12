#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
sudo apt-get update -qq
sudo apt-get install -y docker.io docker-compose-v2 openssl curl
sudo systemctl enable --now docker
if ! swapon --show | grep -q /swapfile; then
  if [[ ! -e /swapfile ]]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  fi
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
if [[ ! -f .env ]]; then
  umask 077
  printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\nWEB_PORT=80\nSEED_DEMO=false\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > .env
fi
mkdir -p recordings
sudo docker compose config --quiet
sudo docker compose up -d --build
for attempt in {1..60}; do
  if curl -fsS http://127.0.0.1/api/channels >/dev/null; then
    echo 'Twitchnt listo: HTTP 80 y RTMP 1935. Registra tu usuario desde la web.'
    exit 0
  fi
  sleep 2
done
sudo docker compose logs --tail=50
exit 1
