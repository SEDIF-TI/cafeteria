package com.sedif.sistema_cafeteria.core.recetas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaResumenDTO {
    private Long productoId;
    private String productoNombre;
    private Double precio;
    private int totalIngredientes;
    private Long porcionesDisponibles;
    private String insumoLimitante;
}