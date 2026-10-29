#!/usr/bin/env bash
# ===========================================================================
#  Respaldo automatico de la base de la cafeteria. Lo ejecuta cron cada noche.
#
#  1. pg_dump en formato comprimido (-Fc) desde el contenedor de postgres.
#  2. Verifica que el archivo se pueda leer (pg_restore --list) antes de darlo por bueno.
#  3. Guarda: diarios 14 dias, semanales (domingo) 8 semanas, mensuales (dia 1) 12 meses.
#  4. Si hay RCLONE_DESTINO, sube una copia fuera del servidor (nunca borra en la nube).
#  5. Si algo falla, avisa por correo.
#
#  Manual:  ~/cafeteria/infra/respaldos/respaldo-bd.sh
# ===========================================================================
set -euo pipefail
source "$(dirname "$0")/../comun.sh"

CONTENEDOR="${CONTENEDOR:-postgres_cafeteria}"
RESPALDOS_DIR="${RESPALDOS_DIR:-/srv/respaldos/cafeteria}"
DIAS_DIARIOS=14
DIAS_SEMANALES=56
DIAS_MENSUALES=365

falla() {
    rm -f "${archivo:-}.tmp"
    avisar "FALLO el respaldo de la base" "El respaldo del $(date '+%F %T') no se completo (linea $1). Revisa $RESPALDOS_DIR/respaldo.log"
    ping_monitor "${PING_RESPALDO:-}" /fail
}
trap 'falla $LINENO' ERR

# Datos personales: los lee el dueno y el grupo "respaldos" (la PC que los copia), nadie mas.
umask 027
mkdir -p "$RESPALDOS_DIR"/{diario,semanal,mensual}

archivo="$RESPALDOS_DIR/diario/cafeteria_$(date +%F_%H%M).dump"
log "Inicia respaldo -> $archivo"

docker exec "$CONTENEDOR" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$archivo.tmp"
docker exec -i "$CONTENEDOR" pg_restore --list < "$archivo.tmp" > /dev/null
mv "$archivo.tmp" "$archivo"
log "Respaldo verificado ($(du -h "$archivo" | cut -f1))"

if [ "$(date +%u)" = 7 ];  then cp "$archivo" "$RESPALDOS_DIR/semanal/"; fi
if [ "$(date +%d)" = 01 ]; then cp "$archivo" "$RESPALDOS_DIR/mensual/"; fi

find "$RESPALDOS_DIR/diario"  -name '*.dump*' -mtime +$DIAS_DIARIOS   -delete
find "$RESPALDOS_DIR/semanal" -name '*.dump'  -mtime +$DIAS_SEMANALES -delete
find "$RESPALDOS_DIR/mensual" -name '*.dump'  -mtime +$DIAS_MENSUALES -delete

if [ -n "${RCLONE_DESTINO:-}" ]; then
    # "copy" y no "sync": si alguien borra (o un virus cifra) los respaldos
    # locales, la nube no replica ese borrado.
    rclone copy "$RESPALDOS_DIR" "$RCLONE_DESTINO" --include '*.dump' --log-level ERROR
    log "Copia subida a $RCLONE_DESTINO"
fi

ping_monitor "${PING_RESPALDO:-}"
log "Respaldo terminado"
