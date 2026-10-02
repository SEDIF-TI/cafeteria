package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.inventario.UnidadMedida;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductoRequestRecord(
        @NotBlank(message = "El nombre del producto es obligatorio")
        @Size(max = 100, message = "El nombre no puede exceder los 100 caracteres")
        String nombre,

        @Size(max = 255, message = "La descripción no puede exceder los 255 caracteres")
        String descripcion,

        @NotNull(message = "El precio es obligatorio")
        @Min(value = 0, message = "El precio no puede ser negativo")
        BigDecimal precio,

        @NotNull(message = "Debe especificar si el producto es directo")
        Boolean esDirecto,

        Long inventarioId, // Obligatorio si es directo

        @Min(value = 0, message = "El stock no puede ser negativo")

        BigDecimal stock, // Obligatorio si es directo

        BigDecimal stockMinimo, // Obligatorio si es directo

        UnidadMedida unidadMedida, // Obligatorio si es directo

        @NotNull(message = "La categoría es obligatoria")
        Long categoriaId
) {
}