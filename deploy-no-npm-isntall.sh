#!/bin/bash

set -e

cd /home/master/applications/nwnmfyndne/public_html

# The running server lives in .beta-runtime (a copy of the build), so rebuilding
# .next never removes files it is using, and _next/static keeps the previous
# build's files until they are a week old, so pages already open in a browser
# can still load their scripts.
RUNTIME=.beta-runtime

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

echo "Building app..."
npm run build

echo "Preparing standalone files..."
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public .next/standalone/

echo "Adding static files for Nginx (previous build's files are kept)..."
mkdir -p _next
cp -a .next/static _next/

echo "Copying public assets to web root..."
if [ -d public ] && [ "$(ls -A public 2>/dev/null)" ]; then
  cp -r public/* ./
else
  echo "public folder is empty or missing, skipping public asset copy."
fi

echo "Switching the server to the new build..."
rm -rf "$RUNTIME.new" "$RUNTIME.old"
rsync -a .next/standalone/ "$RUNTIME.new/"
if [ -d "$RUNTIME" ]; then
  mv "$RUNTIME" "$RUNTIME.old"
fi
mv "$RUNTIME.new" "$RUNTIME"

echo "Restarting PM2..."
pm2 restart asvab-tutoring-beta --update-env
rm -rf "$RUNTIME.old"

echo "Saving PM2 process list..."
pm2 save

echo "Removing static files older than 7 days..."
find _next/static -type f -mtime +7 -delete
find _next/static -mindepth 1 -type d -empty -delete

echo "Deploy completed successfully."
