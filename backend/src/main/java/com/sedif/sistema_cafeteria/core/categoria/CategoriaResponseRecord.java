package com.sedif.sistema_cafeteria.core.categoria;

import com.sedif.sistema_cafeteria.core.categoria.Categoria;

public record CategoriaResponseRecord(
        Long id,
        String nombre,
        String descripcion,
        Boolean activo
) {
    // Constructor auxiliar para mapear directamente desde la Entidad al Record
    public CategoriaResponseRecord(Categoria categoria) {
        this(
            categoria.getId(), 
            categoria.getNombre(), 
            categoria.getDescripcion(), 
            categoria.getActivo()
        );
    }
}