#!/usr/bin/env bash
# deploy.sh — pull latest code and restart the app on the EC2 instance.
# Run this ON the server: bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/var/www/fuelsync"
LOG_DIR="/var/log/pm2"

echo "==> Pulling latest code"
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies"
pnpm install --frozen-lockfile --prod=false

echo "==> Building (frontend + backend)"
pnpm build

echo "==> Running DB migrations"
pnpm db:push

echo "==> Restarting app via PM2"
sudo mkdir -p "$LOG_DIR"
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save

echo "==> Done. App is live."
pm2 status fuelsync
