#!/bin/bash
set -e
cd /var/www/service-platform
echo "==> git pull"
git pull
echo "==> npm run build"
npm run build
echo "==> pm2 restart"
pm2 restart service-platform
echo "==> 部署完成"
pm2 status service-platform
