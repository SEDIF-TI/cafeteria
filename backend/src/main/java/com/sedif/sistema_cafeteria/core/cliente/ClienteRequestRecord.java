package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.constraints.NotBlank;

public record ClienteRequestRecord(
        @NotBlank(message = "El nombre es obligatorio")
        String nombre,
        String correoElectronico,
        String telefono
) {}