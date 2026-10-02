package com.sedif.sistema_cafeteria.core.recetas;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RecetaResponseDTO {
    private Long id;
    private Long insumoId;
    private String insumoNombre;
    private BigDecimal cantidad;
    private String unidadMedida;
}