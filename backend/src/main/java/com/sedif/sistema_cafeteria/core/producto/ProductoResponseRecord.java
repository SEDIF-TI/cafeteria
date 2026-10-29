package com.sedif.sistema_cafeteria.core.producto;

import java.math.BigDecimal;

public record ProductoResponseRecord(
    Long id,
    String nombre,
    String descripcion,
    BigDecimal precio,
    BigDecimal costo, // PREPARADO: calculado de la receta
    TipoProducto tipoProducto,
    Boolean esDirecto, // derivado (== tipoProducto DIRECTO); se conserva por compatibilidad
    Boolean activo,
    BigDecimal stockDisponible, // Stock calculado dinámicamente (directo o por receta)
    CategoriaDTO categoria,
    InventarioDTO inventario
) {
    public ProductoResponseRecord(Producto producto, BigDecimal stockDisponible) {
        this(
            producto.getId(),
            producto.getNombre(),
            producto.getDescripcion(),
            producto.getPrecio(),
            producto.getCosto(),
            producto.getTipoProducto(),
            producto.getEsDirecto(),
            producto.getActivo(),
            stockDisponible,
            producto.getCategoria() != null 
                ? new CategoriaDTO(producto.getCategoria().getId(), producto.getCategoria().getNombre()) 
                : null,
            producto.getInventario() != null 
                ? new InventarioDTO(
                    producto.getInventario().getId(), 
                    producto.getInventario().getStockActual(),
                    producto.getInventario().getStockMinimo(),
                    producto.getInventario().getUnidadMedida() != null 
                        ? producto.getInventario().getUnidadMedida().name() 
                        : null
                  ) 
                : null
        );
    }

    public record CategoriaDTO(Long id, String nombre) {}
    
    public record InventarioDTO(Long id, BigDecimal stockActual, BigDecimal stockMinimo, String unidadMedida) {}
}