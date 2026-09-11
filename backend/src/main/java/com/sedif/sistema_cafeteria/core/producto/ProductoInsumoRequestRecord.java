package com.sedif.sistema_cafeteria.core.producto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record ProductoInsumoRequestRecord(
        @NotNull(message = "El ID del insumo de inventario es obligatorio")
        Long inventarioId,

        @NotNull(message = "La cantidad requerida es obligatoria")
        @DecimalMin(value = "0.01", message = "La cantidad requerida debe ser mayor a cero")
        Double cantidadRequerida
) {
}