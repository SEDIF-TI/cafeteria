package com.sedif.sistema_cafeteria.core.producto;

/**
 * Tipo de producto. Reemplaza al antiguo booleano {@code esDirecto}, que era
 * ambiguo (no distinguia "preparado" de "materia prima").
 */
public enum TipoProducto {
    /** Se vende tal cual. Tiene su propio stock en inventario. Ej: agua, refresco. */
    DIRECTO,
    /** Se arma con una receta; su stock se calcula a partir de los insumos. Ej: sandwich. */
    PREPARADO,
    /** Ingrediente/insumo. Tiene stock propio pero NO se vende directo. Ej: leche, cafe. */
    MATERIA_PRIMA
}
