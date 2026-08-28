package com.sedif.sistema_cafeteria.security;

import com.sedif.sistema_cafeteria.core.usuarios.RolUsuario;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtil {

    private static final String PREFIJO_ROL = "ROLE_";

    private SecurityUtil() {
    }

    public static Optional<String> obtenerIdentificadorActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        if ("anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        return Optional.ofNullable(auth.getName()).filter(n -> !n.isBlank());
    }

    public static Optional<String> obtenerRolActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return Optional.empty();
        }
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .map(a -> a.startsWith(PREFIJO_ROL) ? a.substring(PREFIJO_ROL.length()) : a)
                .findFirst();
    }

    public static boolean tieneRol(String rol) {
        return obtenerRolActual()
                .map(actual -> actual.equalsIgnoreCase(rol))
                .orElse(false);
    }

    public static boolean tieneRol(RolUsuario rol) {
        return tieneRol(rol.name());
    }

    public static boolean esAdministrador() {
        return tieneRol(RolUsuario.ADMIN);
    }
}