package com.sedif.sistema_cafeteria.core.inventario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AjusteInventarioRequest(
    @NotNull(message = "La cantidad es obligatoria")
    BigDecimal cantidad, 
    
    @NotBlank(message = "El tipo de ajuste es obligatorio")
    String tipoAjuste, 
    
    @NotBlank(message = "El motivo es obligatorio")
    String motivo
) {}