#!/usr/bin/env bash
# Idempotent provisioning for Kazwire on a fresh Ubuntu 22.04 box (run as root).
# Usage: DOMAIN=kazwire.com bash provision.sh
set -euo pipefail

DOMAIN="${DOMAIN:-kazwire.com}"
REPO="https://github.com/zachmb/newkazwire.git"
APP_DIR="/opt/kazwire"

echo "==> Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ca-certificates ufw

echo "==> Installing Node 20 (NodeSource)"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v20'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Creating kazwire service user"
id kazwire >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin kazwire

echo "==> Fetching app into ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch --all
  git -C "${APP_DIR}" reset --hard origin/main
else
  rm -rf "${APP_DIR}"
  git clone "${REPO}" "${APP_DIR}"
fi

echo "==> Building"
cd "${APP_DIR}"
npm ci
npm run build
chown -R kazwire:kazwire "${APP_DIR}"

echo "==> Installing systemd services"
sed "s#https://kazwire.com#https://${DOMAIN}#g" deploy/kazwire.service > /etc/systemd/system/kazwire.service
cp deploy/kazwire-bare.service /etc/systemd/system/kazwire-bare.service
systemctl daemon-reload
systemctl enable --now kazwire.service kazwire-bare.service

echo "==> Configuring nginx"
sed "s/kazwire.com/${DOMAIN}/g" deploy/nginx-kazwire.conf > /etc/nginx/sites-available/kazwire
ln -sf /etc/nginx/sites-available/kazwire /etc/nginx/sites-enabled/kazwire
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Firewall"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true

echo "==> TLS (Let's Encrypt). Requires DNS A record ${DOMAIN} -> this server."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect || \
  echo "!! certbot failed (likely DNS not pointed yet). Re-run: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

echo "==> Done. App: kazwire.service (127.0.0.1:3000)  Bare: kazwire-bare.service (127.0.0.1:8080)"
systemctl --no-pager status kazwire.service kazwire-bare.service | head -20
