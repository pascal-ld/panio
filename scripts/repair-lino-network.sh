#!/usr/bin/env bash
# Répare le réseau Docker "lino" quand Traefik renvoie 504 (conteneurs isolés).
# Usage : ./scripts/repair-lino-network.sh

set -euo pipefail

PANIO="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="${INFRA_DIR:-$HOME/infra}"

echo "→ Arrêt des stacks sur le réseau lino…"
cd "$INFRA/traefik" && docker compose down 2>/dev/null || true
cd "$INFRA/portainer" && docker compose down 2>/dev/null || true
cd "$PANIO" && docker compose down 2>/dev/null || true

echo "→ Suppression et recréation du réseau lino…"
docker network rm lino 2>/dev/null || true
docker network create lino

echo "→ Redémarrage Traefik, Portainer, Panio…"
cd "$INFRA/traefik" && docker compose up -d
cd "$INFRA/portainer" && docker compose up -d
cd "$PANIO" && docker compose up -d

echo "→ Test de connectivité inter-conteneurs…"
sleep 5
if docker run --rm --network lino curlimages/curl:latest -s --connect-timeout 5 -o /dev/null \
  http://panio-panio-backend-1/api/health 2>/dev/null; then
  echo "✓ Réseau lino OK (backend joignable)"
else
  echo "✗ Échec : essayez aussi :"
  echo "  sudo snap restart docker"
  echo "  sudo iptables -P FORWARD ACCEPT"
  echo "  sudo snap connect docker:firewall-control"
  exit 1
fi

echo "Terminé. Testez : http://panio.local http://portainer.local"
