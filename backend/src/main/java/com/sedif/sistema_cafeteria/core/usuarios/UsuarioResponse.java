package com.sedif.sistema_cafeteria.core.usuarios;

public record UsuarioResponse(
    Long id,
    String nombre,
    String username,
    RolUsuario rol,
    boolean activo,
    String passwordTemporal
) {}