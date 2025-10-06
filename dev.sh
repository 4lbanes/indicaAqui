#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

copy_env_if_missing() {
  local folder="$1"
  local example_file="$ROOT_DIR/$folder/.env.example"
  local env_file="$ROOT_DIR/$folder/.env"

  if [[ -f "$example_file" && ! -f "$env_file" ]]; then
    cp "$example_file" "$env_file"
    echo "[info] Copiado $folder/.env a partir de $folder/.env.example. Ajuste as credenciais conforme necessário."
  fi
}

install_if_needed() {
  local folder="$1"
  if [[ ! -d "$ROOT_DIR/$folder/node_modules" ]]; then
    echo "[info] Instalando dependências em $folder..."
    (cd "$ROOT_DIR/$folder" && npm install)
  fi
}

start_processes() {
  echo "[info] Iniciando backend (npm run dev)..."
  (cd "$ROOT_DIR/backend" && npm run dev) &
  BACK_PID=$!

  echo "[info] Iniciando frontend (npm run dev)..."
  (cd "$ROOT_DIR/frontend" && npm run dev) &
  FRONT_PID=$!

  trap 'echo "\n[info] Encerrando..."; kill $BACK_PID $FRONT_PID 2>/dev/null || true; wait $BACK_PID $FRONT_PID 2>/dev/null || true; exit 0' INT TERM

  wait $BACK_PID $FRONT_PID
}

main() {
  copy_env_if_missing "backend"
  copy_env_if_missing "frontend"

  install_if_needed "backend"
  install_if_needed "frontend"

  start_processes
}

main "$@"
