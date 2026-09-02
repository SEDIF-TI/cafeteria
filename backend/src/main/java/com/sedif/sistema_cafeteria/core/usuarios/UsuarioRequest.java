package com.sedif.sistema_cafeteria.core.usuarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UsuarioRequest(
    @NotBlank(message = "El nombre es obligatorio")
    String nombre,
    
    @NotBlank(message = "El usuario es obligatorio")
    String username,
    
    @NotNull(message = "El rol es obligatorio")
    RolUsuario rol
) {}