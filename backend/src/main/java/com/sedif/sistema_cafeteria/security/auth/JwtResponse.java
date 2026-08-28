package com.sedif.sistema_cafeteria.security.auth;

import com.sedif.sistema_cafeteria.core.usuarios.VistaDTO;

import java.util.List;

/**
 * Datos de sesion devueltos tras un login correcto.
 *
 * <p>Contiene el access token y lo minimo que el frontend necesita para pintar
 * la interfaz sin una segunda llamada: identidad del usuario, su rol, las
 * vistas del menu que le corresponden y el area a la que pertenece.
 * <b>Nunca</b> debe incluir la contrasena ni su hash.</p>
 *
 * <p>Los nombres de los campos forman parte del contrato con el cliente: el
 * frontend los consume tal cual y cambiarlos rompe la sesion.</p>
 */
public record JwtResponse(
        Long usuarioId,
        String nombre,
        String rol,
        String token,
        String mensaje,
        List<VistaDTO> vistas,
        Long areaId
) {}
