#!/usr/bin/env bash
# setup-ec2.sh — run ONCE on a fresh Amazon Linux 2023 / Ubuntu 24.04 EC2 instance.
# Installs Node 22, pnpm, PM2, Nginx, clones the repo, and starts the app.
#
# Usage:
#   chmod +x scripts/setup-ec2.sh
#   sudo bash scripts/setup-ec2.sh
#
# Environment variables you must set in /var/www/fuelsync/.env before running:
#   DATABASE_URL, JWT_SECRET, WEBHOOK_SECRET, VITE_APP_ID, OAUTH_SERVER_URL

set -euo pipefail

REPO="git@github.com:sanepierr/fuelStationERP.git"
APP_DIR="/var/www/fuelsync"
NODE_VERSION="22"

# ─── Detect OS ────────────────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo "Cannot detect OS"; exit 1
fi

echo "==> Detected OS: $OS"

# ─── System packages ──────────────────────────────────────────────────────────
if [[ "$OS" == "amzn" ]]; then
  dnf update -y
  dnf install -y git nginx
elif [[ "$OS" == "ubuntu" ]]; then
  apt-get update -y
  apt-get install -y git nginx curl
fi

# ─── Node.js via fnm ──────────────────────────────────────────────────────────
echo "==> Installing Node $NODE_VERSION via fnm"
curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir /usr/local/fnm --skip-shell
export PATH="/usr/local/fnm:$PATH"
eval "$(fnm env --use-on-cd)"
fnm install "$NODE_VERSION"
fnm use "$NODE_VERSION"
fnm default "$NODE_VERSION"

# Make node/npm available system-wide
NODE_BIN=$(dirname "$(fnm exec --using "$NODE_VERSION" which node)")
ln -sf "$NODE_BIN/node"  /usr/local/bin/node
ln -sf "$NODE_BIN/npm"   /usr/local/bin/npm
ln -sf "$NODE_BIN/npx"   /usr/local/bin/npx

# ─── pnpm ─────────────────────────────────────────────────────────────────────
echo "==> Installing pnpm"
npm install -g pnpm@10
ln -sf "$(which pnpm)" /usr/local/bin/pnpm

# ─── PM2 ──────────────────────────────────────────────────────────────────────
echo "==> Installing PM2"
npm install -g pm2
pm2 startup --hp /root || true    # generate systemd unit
env PATH=$PATH:/usr/local/bin pm2 startup systemd -u root --hp /root || true

# ─── Clone repo ───────────────────────────────────────────────────────────────
echo "==> Cloning repo to $APP_DIR"
mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ─── .env — must be filled in before building ─────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "  Edit $APP_DIR/.env with your real secrets before"
  echo "  running the deploy script!"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
fi

# ─── Install deps + build ─────────────────────────────────────────────────────
echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Building"
pnpm build

# ─── Nginx ────────────────────────────────────────────────────────────────────
echo "==> Configuring Nginx"
cp nginx.conf /etc/nginx/conf.d/fuelsync.conf
# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl enable nginx
systemctl restart nginx

# ─── PM2 log dir ──────────────────────────────────────────────────────────────
mkdir -p /var/log/pm2

# ─── Start app ────────────────────────────────────────────────────────────────
echo "==> Starting app with PM2"
pm2 start ecosystem.config.cjs --env production
pm2 save

echo ""
echo "==> Setup complete!"
echo "    Visit http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<your-ec2-ip>')"
echo "    Tail logs: pm2 logs fuelsync"
