package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.constraints.NotBlank;

public record ClienteLoginRequest(
        @NotBlank(message = "El número de control o empleado es obligatorio")
        String numeroControlEmpleado,

        @NotBlank(message = "La contraseña es obligatoria")
        String password
) {}