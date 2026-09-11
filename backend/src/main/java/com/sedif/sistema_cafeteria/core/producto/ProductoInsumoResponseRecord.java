package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.inventario.UnidadMedida;
// Línea eliminada aquí

public record ProductoInsumoResponseRecord(
        Long id,
        Long productoId,
        Long inventarioId,
        String insumoNombre,
        UnidadMedida unidadMedida,
        Double cantidadRequerida
) {
    public ProductoInsumoResponseRecord(ProductoInsumo productoInsumo) {
        this(
            productoInsumo.getId(),
            productoInsumo.getProducto().getId(),
            productoInsumo.getInsumo().getId(),
            productoInsumo.getInsumo().getNombre(),
            productoInsumo.getInsumo().getUnidadMedida(),
            productoInsumo.getCantidadRequerida()
        );
    }
}