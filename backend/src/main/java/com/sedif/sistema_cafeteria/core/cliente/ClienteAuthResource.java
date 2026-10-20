package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.exception.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Apartado del cliente: login con token, cambio de contrasena, recuperacion por
 * correo y consulta de sus deudas e historial. Los endpoints {@code /mi*} toman
 * la identidad del token (nunca de un id en la URL), asi nadie ve datos ajenos.
 */
@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteAuthResource {

    private final ClienteAuthService clienteAuthService;

    @PostMapping("/login")
    public ResponseEntity<ClienteLoginResponse> login(@RequestBody @Valid ClienteLoginRequest request) {
        return ResponseEntity.ok(clienteAuthService.login(request));
    }

    @PostMapping("/cambiar-password")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<ApiResponse<Void>> cambiarPassword(
            Authentication auth, @RequestBody @Valid CambiarPasswordRequest request) {
        clienteAuthService.cambiarPassword(auth.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok("Contrasena actualizada."));
    }

    @PostMapping("/recuperar/solicitar")
    public ResponseEntity<ApiResponse<Void>> solicitarCodigo(@RequestBody @Valid RecuperarSolicitarRequest request) {
        clienteAuthService.solicitarCodigo(request);
        return ResponseEntity.ok(ApiResponse.ok("Si el codigo existe y tiene correo registrado, enviamos un codigo de verificacion."));
    }

    @PostMapping("/recuperar/confirmar")
    public ResponseEntity<ApiResponse<Void>> confirmarCodigo(@RequestBody @Valid RecuperarConfirmarRequest request) {
        clienteAuthService.confirmarCodigo(request);
        return ResponseEntity.ok(ApiResponse.ok("Contrasena restablecida. Ya puedes iniciar sesion."));
    }

    @GetMapping("/mi-cuenta")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<ClienteResponseRecord> miCuenta(Authentication auth) {
        return ResponseEntity.ok(clienteAuthService.miCuenta(auth.getName()));
    }

    @GetMapping("/mis-deudas")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<List<TicketDetalladoResponseRecord>> misDeudas(Authentication auth) {
        return ResponseEntity.ok(clienteAuthService.misDeudas(auth.getName()));
    }

    @GetMapping("/mis-tickets")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<List<TicketDetalladoResponseRecord>> misTickets(Authentication auth) {
        return ResponseEntity.ok(clienteAuthService.miHistorial(auth.getName()));
    }
}
