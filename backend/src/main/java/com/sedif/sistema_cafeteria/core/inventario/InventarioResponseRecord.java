package com.sedif.sistema_cafeteria.core.inventario;

import java.math.BigDecimal;

public record InventarioResponseRecord(
        Long id,
        String nombre,
        UnidadMedida unidadMedida,
        BigDecimal stockActual,
        BigDecimal stockMinimo,
        Boolean activo
) {
    public InventarioResponseRecord(Inventario inventario) {
        this(
            inventario.getId(),
            inventario.getNombre(),
            inventario.getUnidadMedida(),
            inventario.getStockActual(),
            inventario.getStockMinimo(),
            inventario.getActivo()
        );
    }
}