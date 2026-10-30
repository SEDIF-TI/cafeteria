# ===========================================================================
#  Funciones compartidas por los scripts de infra (respaldos y monitoreo).
#  No se ejecuta solo: se carga con "source".
#
#  Configuracion opcional en infra/infra.conf (no versionado, ver infra.conf.example):
#    AVISO_CORREO   a quien llegan los avisos de falla (usa el SMTP del .env)
#    PING_*         URLs de healthchecks.io para avisar si un script deja de correr
# ===========================================================================

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROYECTO="$(dirname "$INFRA_DIR")"
[ -f "$INFRA_DIR/infra.conf" ] && source "$INFRA_DIR/infra.conf"

log() { echo "$(date '+%F %T') $*"; }

# Lee una variable del .env del proyecto sin cargar todo el archivo.
leer_env() {
    # tr quita el \r si el .env se copio desde Windows (si no, la contrasena llevaria un caracter de mas).
    grep -E "^$1=" "$PROYECTO/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

# avisar "asunto" "mensaje": manda correo con el SMTP del sistema. Si no hay
# AVISO_CORREO configurado, solo lo deja en el log.
avisar() {
    log "AVISO: $1 - $2"
    [ -n "${AVISO_CORREO:-}" ] || return 0

    local host puerto usuario clave error
    host="$(leer_env MAIL_HOST)";     host="${host:-smtp.gmail.com}"
    puerto="$(leer_env MAIL_PORT)";   puerto="${puerto:-587}"
    usuario="$(leer_env MAIL_USERNAME)"
    clave="$(leer_env MAIL_PASSWORD)"

    if [ -z "$usuario" ] || [ -z "$clave" ]; then
        log "No se pudo enviar el correo de aviso: faltan MAIL_USERNAME o MAIL_PASSWORD en $PROYECTO/.env"
        return 0
    fi

    # -sS: sin barra de progreso pero mostrando el error, que se guarda en el log.
    error="$(printf 'From: Cafeteria SEDIF <%s>\r\nTo: %s\r\nSubject: [Cafeteria SEDIF] %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n\r\nServidor: %s\r\n' \
                "$usuario" "$AVISO_CORREO" "$1" "$2" "$(hostname)" |
             curl -sS --ssl-reqd --url "smtp://$host:$puerto" --user "$usuario:$clave" \
                  --mail-from "$usuario" --mail-rcpt "$AVISO_CORREO" -T - 2>&1)" \
        && log "Correo de aviso enviado a $AVISO_CORREO" \
        || log "No se pudo enviar el correo de aviso: $error"
}

# ping URL [sufijo]: avisa a healthchecks.io que el script corrio (sufijo /fail = fallo).
# Si el script deja de correr por completo, es healthchecks quien manda el aviso.
ping_monitor() {
    [ -n "${1:-}" ] && curl -fsS -m 10 --retry 3 "$1${2:-}" >/dev/null || true
}
