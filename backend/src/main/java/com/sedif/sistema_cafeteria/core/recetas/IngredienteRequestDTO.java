package com.sedif.sistema_cafeteria.core.recetas;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class IngredienteRequestDTO {
    private Long insumoId;
    private BigDecimal cantidad;
}