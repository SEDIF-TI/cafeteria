package com.sedif.sistema_cafeteria.core.usuarios;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VistaDTO {
    private String nombre;
    private String ruta;
    private String icono;
}