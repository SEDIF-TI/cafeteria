package com.sedif.sistema_cafeteria.core.venta;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record LiquidarDeudaMasivaRequest(
        @NotEmpty(message = "Debe seleccionar al menos un ticket para liquidar")
        List<Long> ventasIds,
        
        @NotNull(message = "El monto total es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
        BigDecimal montoTotalIngresado
) {}