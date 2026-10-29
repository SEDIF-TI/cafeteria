#!/usr/bin/env bash
# ===========================================================================
#  Prueba que un respaldo SI se puede restaurar, sin tocar la base real:
#  lo carga en una base temporal, cuenta registros y la borra.
#
#  Uso:  probar-restauracion.sh [archivo.dump]   (sin argumento: el mas reciente)
#  Recomendado: una vez al mes.
# ===========================================================================
set -euo pipefail
source "$(dirname "$0")/../comun.sh"

CONTENEDOR="${CONTENEDOR:-postgres_cafeteria}"
RESPALDOS_DIR="${RESPALDOS_DIR:-/srv/respaldos/cafeteria}"
BASE_PRUEBA="prueba_restauracion"
USUARIO="$(leer_env POSTGRES_USER)"

archivo="${1:-$(ls -t "$RESPALDOS_DIR"/diario/*.dump | head -1)}"
log "Probando $archivo en la base temporal $BASE_PRUEBA"

sql() { docker exec "$CONTENEDOR" psql -U "$USUARIO" -v ON_ERROR_STOP=1 "$@"; }
trap 'sql -d postgres -qc "DROP DATABASE IF EXISTS $BASE_PRUEBA" >/dev/null' EXIT

sql -d postgres -qc "DROP DATABASE IF EXISTS $BASE_PRUEBA" >/dev/null
sql -d postgres -qc "CREATE DATABASE $BASE_PRUEBA" >/dev/null
docker exec -i "$CONTENEDOR" pg_restore -U "$USUARIO" -d "$BASE_PRUEBA" --no-owner --exit-on-error < "$archivo"

sql -d "$BASE_PRUEBA" -c "
  SELECT 'producto' AS tabla, count(*) AS registros FROM producto UNION ALL
  SELECT 'venta',   count(*) FROM venta   UNION ALL
  SELECT 'cliente', count(*) FROM cliente UNION ALL
  SELECT 'usuario', count(*) FROM usuario"

log "Restauracion correcta. La base temporal se elimina al salir."
