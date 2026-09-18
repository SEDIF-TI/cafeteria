package com.sedif.sistema_cafeteria.core.producto;

import java.math.BigDecimal;

public record ProductoResponseRecord(
    Long id,
    String nombre,
    String descripcion,
    BigDecimal precio,
    Boolean esDirecto,
    Boolean activo,
    CategoriaDTO categoria,
    InventarioDTO inventario
) {
    public ProductoResponseRecord(Producto producto) {
        this(
            producto.getId(),
            producto.getNombre(),
            producto.getDescripcion(),
            producto.getPrecio(),
            producto.getEsDirecto(),
            producto.getActivo(),
            producto.getCategoria() != null 
                ? new CategoriaDTO(producto.getCategoria().getId(), producto.getCategoria().getNombre()) 
                : null,
            producto.getInventario() != null 
                ? new InventarioDTO(
                    producto.getInventario().getId(), 
                    producto.getInventario().getStockActual(),
                    producto.getInventario().getStockMinimo(),
                    // Obtenemos la unidad de medida como texto (String)
                    producto.getInventario().getUnidadMedida() != null 
                        ? producto.getInventario().getUnidadMedida().name() 
                        : null
                  ) 
                : null
        );
    }

    public record CategoriaDTO(Long id, String nombre) {}
    
    // Agregamos unidadMedida al final
    public record InventarioDTO(Long id, BigDecimal stockActual, BigDecimal stockMinimo, String unidadMedida) {}
}