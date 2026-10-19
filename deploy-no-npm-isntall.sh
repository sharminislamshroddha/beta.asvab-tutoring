#!/bin/bash

set -e

cd /home/master/applications/nwnmfyndne/public_html

echo "Loading Node/NVM in current shell..."
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20.20.1

echo "Loading environment variables..."
set -a
source .env.local
set +a

echo "Cleaning old build..."
rm -rf .next
rm -rf _next

echo "Building app..."
npm run build

echo "Preparing standalone files..."
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public .next/standalone/

echo "Preparing Nginx static files..."
mkdir -p _next
cp -a .next/static _next/

echo "Copying public assets to web root..."
if [ -d public ] && [ "$(ls -A public 2>/dev/null)" ]; then
  cp -r public/* ./
else
  echo "public folder is empty or missing, skipping public asset copy."
fi

echo "Restarting PM2..."
pm2 restart asvab-tutoring-beta --update-env

echo "Saving PM2 process list..."
pm2 save

echo "Deploy completed successfully."
