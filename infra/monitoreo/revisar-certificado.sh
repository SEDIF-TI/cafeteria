#!/usr/bin/env bash
# ===========================================================================
#  Revisa cuantos dias le quedan al certificado HTTPS. Lo ejecuta cron a diario.
#
#  Caddy renueva solo unos 30 dias antes de que venza. Si quedan menos de
#  DIAS_MINIMOS, la renovacion lleva dias fallando: se avisa por correo con
#  los ultimos errores de Caddy.
#
#  Manual:  ~/cafeteria/infra/monitoreo/revisar-certificado.sh
# ===========================================================================
set -uo pipefail
source "$(dirname "$0")/../comun.sh"

DOMINIOS="${DOMINIOS:-cafeteria.sedif.gob.mx}"
DIAS_MINIMOS="${DIAS_MINIMOS:-20}"
hubo_falla=0

for dominio in $DOMINIOS; do
    # Se pregunta al Caddy local (127.0.0.1) por el nombre: no depende del NAT.
    vence="$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$dominio" 2>/dev/null \
             | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"

    if [ -z "$vence" ]; then
        avisar "Certificado no disponible: $dominio" "Caddy no entrego certificado para $dominio. Ultimos errores:
$(docker logs edge_caddy --since 72h 2>&1 | grep -i error | tail -10)"
        hubo_falla=1
        continue
    fi

    dias=$(( ($(date -d "$vence" +%s) - $(date +%s)) / 86400 ))
    log "$dominio vence el $vence (quedan $dias dias)"

    if [ "$dias" -lt "$DIAS_MINIMOS" ]; then
        avisar "Certificado por vencer: $dominio ($dias dias)" "La renovacion automatica no ha funcionado. Vence: $vence
Ultimos errores de Caddy:
$(docker logs edge_caddy --since 72h 2>&1 | grep -i error | tail -10)"
        hubo_falla=1
    fi
done

if [ "$hubo_falla" = 1 ]; then ping_monitor "${PING_CERTIFICADO:-}" /fail; else ping_monitor "${PING_CERTIFICADO:-}"; fi
exit "$hubo_falla"
