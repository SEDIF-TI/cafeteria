package com.sedif.sistema_cafeteria.security.auth;

import com.sedif.sistema_cafeteria.exception.ApiResponse;
import com.sedif.sistema_cafeteria.core.cliente.ClienteAuthService;
import com.sedif.sistema_cafeteria.core.cliente.ClienteLoginRequest;
import com.sedif.sistema_cafeteria.core.cliente.ClienteLoginResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;
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
    private final ClienteAuthService clienteAuthService;

    /**
     * Acceso unificado: prueba primero como personal y, si falla, como cliente,
     * en UNA sola petición. Así el navegador no registra un 400 cuando entra un
     * cliente (antes se intentaba /auth/login y /clientes/login por separado).
     */
    @PostMapping("/acceso")
    public ResponseEntity<Map<String, Object>> acceso(@Valid @RequestBody LoginRequest request) {
        try {
            JwtResponse r = authService.iniciarSesion(request);
            return ResponseEntity.ok(Map.of("tipo", "STAFF", "data", r));
        } catch (RuntimeException staffEx) {
            try {
                ClienteLoginResponse c = clienteAuthService.login(
                        new ClienteLoginRequest(request.identificador(), request.password()));
                return ResponseEntity.ok(Map.of("tipo", "CLIENTE", "data", c));
            } catch (RuntimeException clienteEx) {
                throw new IllegalArgumentException("Credenciales incorrectas o la cuenta está inactiva.");
            }
        }
    }

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

    @PostMapping("/recuperar-password")
    public ResponseEntity<?> recuperarPassword(@RequestBody Map<String, String> request) {
        String identificador = request.get("identificador");
        
        if (identificador == null || identificador.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El identificador es obligatorio."));
        }

        // Ejecutamos la lógica de generación y envío por Telegram
        authService.recuperarPassword(identificador);
        
        // Devolvemos un mensaje genérico por seguridad (para no revelar si el usuario existe o no ante atacantes)
        return ResponseEntity.ok(Map.of("mensaje", "Si el usuario existe y tiene su cuenta vinculada, recibirá su contraseña temporal por Telegram."));
    }

    @PutMapping("/actualizar-password")
    public ResponseEntity<?> actualizarPassword(@RequestBody Map<String, String> request, Principal principal) {
        String nuevaPassword = request.get("nuevaPassword");
        
        if (nuevaPassword == null || nuevaPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "La contraseña debe tener al menos 6 caracteres."));
        }

        // Llamada al servicio para hashear y guardar
        authService.actualizarPasswordDefinitiva(principal.getName(), nuevaPassword);
        
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada exitosamente."));
    }
}
