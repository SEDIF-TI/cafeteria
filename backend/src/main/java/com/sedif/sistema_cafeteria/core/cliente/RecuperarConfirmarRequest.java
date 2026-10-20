package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecuperarConfirmarRequest(
        @NotBlank(message = "El codigo de empleado es obligatorio")
        String numeroControlEmpleado,

        @NotBlank(message = "El codigo de verificacion es obligatorio")
        String codigo,

        @NotBlank(message = "La nueva contrasena es obligatoria")
        @Size(min = 6, max = 100, message = "La nueva contrasena debe tener entre 6 y 100 caracteres")
        String passwordNueva
) {}
