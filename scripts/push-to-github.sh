#!/bin/bash
set -e

REPO_DIR="/home/sinc/docker/antigravity-customizations-manager"
cd "$REPO_DIR"

echo "=== Sincronizando Gestor de Tokens IA com GitHub ==="
git add .
if ! git diff --cached --quiet; then
  git commit -m "update: sincronização com GitHub $(date '+%Y-%m-%d %H:%M')"
fi

echo "Enviando commits para origin main (via SSH)..."
git push -u origin main

echo "=== Sincronização concluída com sucesso! ==="
