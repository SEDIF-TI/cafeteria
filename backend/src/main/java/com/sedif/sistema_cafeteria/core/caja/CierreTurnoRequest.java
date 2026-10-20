package com.sedif.sistema_cafeteria.core.caja;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Arqueo: el efectivo realmente contado en la caja al cerrar el turno. */
public record CierreTurnoRequest(
        @NotNull(message = "El efectivo contado es obligatorio")
        @DecimalMin(value = "0.0", inclusive = true, message = "El efectivo contado no puede ser negativo")
        BigDecimal totalContado
) {}
