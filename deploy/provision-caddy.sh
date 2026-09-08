#!/usr/bin/env bash
# Switch the Kazwire edge from nginx to Caddy so ANY domain pointed at this box is
# auto-hosted with on-demand HTTPS (the /portal "add your domain" feature).
#
# Run as root on the Kazwire VPS (51.81.210.201), AFTER the app is already deployed
# by provision.sh (kazwire.service on :3000, kazwire-bare.service on :8080).
#
#   sudo bash /opt/kazwire/deploy/provision-caddy.sh
#
# Idempotent. It stops nginx (frees 80/443), installs Caddy, drops in the Caddyfile,
# ensures the registry data dir exists, and starts Caddy.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kazwire}"
DATA_DIR="${KAZWIRE_DATA_DIR:-/opt/kazwire/data}"

echo "==> Ensuring registry data dir ${DATA_DIR}"
mkdir -p "${DATA_DIR}"
chown -R kazwire:kazwire "${DATA_DIR}" || true

echo "==> The app service must expose KAZWIRE_DATA_DIR so the registry persists."
if ! grep -q "KAZWIRE_DATA_DIR" /etc/systemd/system/kazwire.service; then
	sed -i "/Environment=PORT=3000/a Environment=KAZWIRE_DATA_DIR=${DATA_DIR}" /etc/systemd/system/kazwire.service
	systemctl daemon-reload
	systemctl restart kazwire.service
fi

echo "==> Installing Caddy (official apt repo)"
if ! command -v caddy >/dev/null 2>&1; then
	apt-get update -y
	apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -y
	apt-get install -y caddy
fi

echo "==> Freeing ports 80/443 (stop + disable nginx; Caddy takes over the edge)"
systemctl disable --now nginx || true

echo "==> Installing Caddyfile"
install -D -m 0644 "${APP_DIR}/deploy/Caddyfile" /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

echo "==> Starting Caddy"
systemctl enable --now caddy
systemctl restart caddy

echo "==> Done. Caddy is on 80/443 with on-demand TLS."
echo "    Test:  curl -I https://kazwire.com"
echo "    A new domain goes live ~1 min after (a) it's added at /portal and (b) its"
echo "    A record points to this box. First HTTPS hit triggers the cert."
systemctl --no-pager status caddy | head -12
