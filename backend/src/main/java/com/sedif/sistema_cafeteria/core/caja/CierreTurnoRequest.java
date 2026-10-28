package com.sedif.sistema_cafeteria.core.caja;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Arqueo: el efectivo realmente contado en la caja al cerrar el turno.
 *
 * Si al cerrar hay FALTANTE, el cierre requiere la autorización de un
 * administrador (su usuario y contraseña) y un motivo; esos campos solo se
 * usan en ese caso.
 */
public record CierreTurnoRequest(
        @NotNull(message = "El efectivo contado es obligatorio")
        @DecimalMin(value = "0.0", inclusive = true, message = "El efectivo contado no puede ser negativo")
        BigDecimal totalContado,

        String autorizadorUsuario,
        String autorizadorPassword,
        String motivo
) {}
