package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.constraints.NotBlank;

public record RecuperarSolicitarRequest(
        @NotBlank(message = "El codigo de empleado es obligatorio")
        String numeroControlEmpleado
) {}
