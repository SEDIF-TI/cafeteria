package com.sedif.sistema_cafeteria.core.producto;

import java.math.BigDecimal; // <-- Importante

public record ProductoResponseRecord(
        Long id,
        String nombre,
        String descripcion,
        BigDecimal precio, // <-- Cambiado a BigDecimal
        Boolean esDirecto,
        Long inventarioId,
        String inventarioNombre,
        Long categoriaId,
        String categoriaNombre,
        Boolean activo
) {
    public ProductoResponseRecord(Producto producto) {
        this(
            producto.getId(),
            producto.getNombre(),
            producto.getDescripcion(),
            producto.getPrecio(),
            producto.getEsDirecto(),
            producto.getInventario() != null ? producto.getInventario().getId() : null,
            producto.getInventario() != null ? producto.getInventario().getNombre() : null,
            producto.getCategoria().getId(),
            producto.getCategoria().getNombre(),
            producto.getActivo()
        );
    }
}