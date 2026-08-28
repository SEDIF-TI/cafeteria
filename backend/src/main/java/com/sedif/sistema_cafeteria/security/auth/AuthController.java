package com.sedif.sistema_cafeteria.security.auth;

import com.sedif.sistema_cafeteria.exception.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints publicos de autenticacion.
 *
 * <p>Es la unica ruta que {@code SecurityConfig} deja accesible sin token, y
 * por eso {@code RateLimitingFilter} la vigila frente a ataques de fuerza
 * bruta.</p>
 *
 * <p>Solo expone el login. El alta de usuarios corresponde a
 * {@code UsuarioResource}, que exige rol ADMINISTRADOR: crear cuentas eligiendo
 * el rol es una operacion privilegiada y no puede quedar en una ruta publica.</p>
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Valida las credenciales y devuelve el JWT junto con los datos de sesion.
     *
     * <p>El formato del cuerpo lo comprueba Bean Validation por el
     * {@code @Valid}; unas credenciales incorrectas terminan en
     * {@code IllegalArgumentException} y el manejador global las convierte en
     * un 400 con mensaje generico.</p>
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest request) {
        JwtResponse respuesta = authService.iniciarSesion(request);
        return ResponseEntity.ok(ApiResponse.ok(respuesta, respuesta.mensaje()));
    }
}
