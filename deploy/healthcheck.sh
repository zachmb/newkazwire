#!/usr/bin/env bash
# Kazwire uptime watchdog. Run by kazwire-healthcheck.timer every 3 min.
#
# systemd Restart=always already recovers HARD crashes; this catches SOFT
# failures (process alive but not serving / edge wedged / port not listening),
# restarts the offending service, and logs to the journal. If an alert webhook
# is configured it also pings Discord — otherwise that step is a silent no-op.
#
# Optional: put  KAZWIRE_ALERT_WEBHOOK=https://discord.com/api/webhooks/...
# in /etc/kazwire.env (or export it) to get failure alerts. Dormant if unset.
set -uo pipefail

[ -f /etc/kazwire.env ] && . /etc/kazwire.env 2>/dev/null || true
log(){ echo "[$(date -u +%FT%TZ)] healthcheck: $*"; }
PROBLEMS=""

alert(){
  local msg="$1"
  [ -n "${KAZWIRE_ALERT_WEBHOOK:-}" ] || return 0
  curl -fsS -m 10 -H 'Content-Type: application/json' \
    -d "{\"content\":\"⚠️ Kazwire: ${msg}\"}" "$KAZWIRE_ALERT_WEBHOOK" >/dev/null 2>&1 || true
}

# 1) SvelteKit app on :3000 (root returns 200)
if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000/ 2>/dev/null)" != "200" ]; then
  log "app :3000 not serving -> restart kazwire"; systemctl restart kazwire; PROBLEMS="$PROBLEMS app"
fi

# 2) Proxy-server (wisp/bare) on :8080 — check the port is listening
if ! ss -ltn 2>/dev/null | grep -q '127.0.0.1:8080'; then
  log "proxy-server :8080 not listening -> restart kazwire-bare"; systemctl restart kazwire-bare; PROBLEMS="$PROBLEMS proxy"
fi

# 3) Edge (Caddy) serving kazwire.com over TLS
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 --resolve kazwire.com:443:127.0.0.1 https://kazwire.com/ 2>/dev/null)
if [ "$CODE" != "200" ]; then
  log "edge https kazwire.com -> $CODE -> restart caddy"; systemctl restart caddy; PROBLEMS="$PROBLEMS edge"
fi

# 4) Cert-ask endpoint (on-demand TLS depends on it) must approve an owned domain
if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 'http://127.0.0.1:3000/api/domains/verify?domain=kazwire.com' 2>/dev/null)" != "200" ]; then
  log "verify endpoint not returning 200 for kazwire.com (on-demand TLS at risk)"; PROBLEMS="$PROBLEMS verify"
fi

if [ -n "$PROBLEMS" ]; then
  log "issues remediated:$PROBLEMS"
  alert "unhealthy + auto-remediated:$PROBLEMS ($(hostname))"
  exit 1
fi
log "ok (app+proxy+edge+verify healthy)"
