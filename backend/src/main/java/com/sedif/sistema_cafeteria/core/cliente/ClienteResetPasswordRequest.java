package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.constraints.NotBlank;

public record ClienteResetPasswordRequest(
        @NotBlank(message = "El número de control es obligatorio")
        String numeroControlEmpleado,

        @NotBlank(message = "El correo electrónico es obligatorio")
        String email,

        @NotBlank(message = "El teléfono es obligatorio")
        String telefono
) {}