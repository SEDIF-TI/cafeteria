package com.sedif.sistema_cafeteria.core.inventario;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record InventarioRequestRecord(
        @NotBlank(message = "El nombre del insumo o producto es obligatorio")
        @Size(max = 100, message = "El nombre no puede exceder los 100 caracteres")
        String nombre,

        @NotNull(message = "La unidad de medida es obligatoria")
        UnidadMedida unidadMedida,

        @NotNull(message = "El stock actual es obligatorio")
        @DecimalMin(value = "0.0", message = "El stock actual no puede ser negativo")
        BigDecimal stockActual,

        @NotNull(message = "El stock mínimo es obligatorio")
        @DecimalMin(value = "0.0", message = "El stock mínimo no puede ser negativo")
        BigDecimal stockMinimo
) {
}