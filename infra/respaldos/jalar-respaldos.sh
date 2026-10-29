#!/usr/bin/env bash
# ===========================================================================
#  Corre en la PC Linux de respaldos (NO en la VM). Trae a esta PC los
#  respaldos de /srv/respaldos de la VM, de TODOS los sistemas.
#
#  - La PC "jala": la VM no tiene acceso a esta PC, asi que si alguien toma
#    la VM no puede borrar estas copias.
#  - Entra con una llave SSH limitada en la VM a SOLO LEER /srv/respaldos (rrsync -ro).
#  - Nunca borra lo que ya trajo aunque se borre en la VM; aqui se guardan mas tiempo.
#  - Cron lo corre cada 4 horas. No genera copias: la VM hace una por noche y
#    esto solo trae lo nuevo (si la PC estuvo apagada, se pone al dia).
#
#  Ver DESPLIEGUE-UBUNTU-SERVER.md, seccion 10.
# ===========================================================================
set -uo pipefail

VM="${VM:-respaldos@10.10.10.65}"
LLAVE="${LLAVE:-$HOME/.ssh/respaldos_vm}"
DESTINO="${DESTINO:-$HOME/respaldos-vm}"
PING_URL="${PING_URL:-}"      # opcional: healthchecks.io
HORAS_MAX_SIN_NUEVO=36        # si el respaldo mas nuevo es mas viejo que esto, algo fallo en la VM

log() { echo "$(date '+%F %T') $*"; }
fallo() {
    log "ERROR: $1"
    [ -n "$PING_URL" ] && curl -fsS -m 10 --retry 3 "$PING_URL/fail" >/dev/null
    exit 1
}

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"   # datos personales: solo el usuario de la PC

# "./" es la raiz que permite rrsync en la VM, o sea /srv/respaldos.
rsync -a --chmod=D700,F600 -e "ssh -i $LLAVE -o BatchMode=yes -o ConnectTimeout=20" \
      "$VM:./" "$DESTINO/" \
    || fallo "no se pudo copiar desde la VM ($VM)"

# Limpieza propia de esta PC (mas larga que la de la VM).
find "$DESTINO" -path '*/diario/*'  -name '*.dump' -mtime +60  -delete
find "$DESTINO" -path '*/semanal/*' -name '*.dump' -mtime +180 -delete
find "$DESTINO" -path '*/mensual/*' -name '*.dump' -mtime +1095 -delete

# Si la copia funciono pero la VM dejo de generar respaldos, tambien es un fallo.
for sistema in "$DESTINO"/*/; do
    [ -d "$sistema/diario" ] || continue
    nuevo="$(find "$sistema/diario" -name '*.dump' -mmin -$((HORAS_MAX_SIN_NUEVO * 60)) | head -1)"
    [ -n "$nuevo" ] || fallo "$(basename "$sistema"): no hay respaldo de las ultimas $HORAS_MAX_SIN_NUEVO horas"
done

[ -n "$PING_URL" ] && curl -fsS -m 10 --retry 3 "$PING_URL" >/dev/null
log "Copia correcta en $DESTINO ($(du -sh "$DESTINO" | cut -f1))"
