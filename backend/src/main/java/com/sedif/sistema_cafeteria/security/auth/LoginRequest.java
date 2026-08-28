package com.sedif.sistema_cafeteria.security.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciales enviadas al iniciar sesion.
 *
 * <p>El identificador admite tanto el correo como el nombre de usuario. Las
 * restricciones las aplica Bean Validation por el {@code @Valid} del
 * controlador, antes de que la peticion llegue al servicio, lo que evita
 * consultas a la base de datos con entradas vacias o absurdas. Los limites de
 * tamano tambien acotan el coste de procesar cuerpos enormes.</p>
 *
 * <p>El limite superior de {@code password} no restringe la contrasena real
 * del usuario: BCrypt solo considera los primeros 72 bytes, asi que 100
 * caracteres es un techo holgado y seguro.</p>
 */
public record LoginRequest(

        @NotBlank(message = "El correo o nombre de usuario es obligatorio.")
        @Size(max = 150, message = "El identificador no puede exceder 150 caracteres.")
        String identificador,

        @NotBlank(message = "La contrasena es obligatoria.")
        @Size(max = 100, message = "La contrasena no puede exceder 100 caracteres.")
        String password

) {}
