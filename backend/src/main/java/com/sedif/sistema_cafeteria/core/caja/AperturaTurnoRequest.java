package com.sedif.sistema_cafeteria.core.caja;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AperturaTurnoRequest(
        @NotNull(message = "El fondo de caja es obligatorio")
        @DecimalMin(value = "0.0", inclusive = true, message = "El fondo inicial no puede ser negativo")
        BigDecimal fondoCaja
) {}