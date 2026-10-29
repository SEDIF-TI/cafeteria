package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.inventario.UnidadMedida;
import com.sedif.sistema_cafeteria.core.recetas.IngredienteRequestDTO;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ProductoRequestRecord(
        @NotBlank(message = "El nombre del producto es obligatorio")
        @Size(max = 100, message = "El nombre no puede exceder los 100 caracteres")
        String nombre,

        @Size(max = 255, message = "La descripción no puede exceder los 255 caracteres")
        String descripcion,

        @NotNull(message = "El precio es obligatorio")
        @Min(value = 0, message = "El precio no puede ser negativo")
        BigDecimal precio,

        @NotNull(message = "El costo es obligatorio")
        @Min(value = 0, message = "El costo no puede ser negativo")
        BigDecimal costo,

        @NotNull(message = "Debe especificar el tipo de producto")
        TipoProducto tipoProducto,

        Long inventarioId, // Obligatorio si es DIRECTO o MATERIA_PRIMA

        @Min(value = 0, message = "El stock no puede ser negativo")

        BigDecimal stock, // Obligatorio si es DIRECTO o MATERIA_PRIMA

        BigDecimal stockMinimo, // Obligatorio si es DIRECTO o MATERIA_PRIMA

        UnidadMedida unidadMedida, // Obligatorio si es DIRECTO o MATERIA_PRIMA

        @NotNull(message = "La categoría es obligatoria")
        Long categoriaId,

        // Solo PREPARADO: la receta se guarda junto con el producto. null = no tocar la receta.
        List<IngredienteRequestDTO> ingredientes
) {
}