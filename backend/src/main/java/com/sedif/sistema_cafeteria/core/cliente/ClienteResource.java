package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteResource {

    private static final String ADMINS = "hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', "
            + "'ROLE_ADMINISTRADOR', 'ADMINISTRADOR', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')";

    private final ClienteService clienteService;
    private final ClienteAuthService clienteAuthService;

    @PostMapping
    public ResponseEntity<ClienteResponseRecord> registrarCliente(@RequestBody @Valid ClienteRequestRecord request) {
        log.info("Recibida petición de registro de cliente: {}", request.nombre());
        ClienteResponseRecord response = clienteService.registrarCliente(request);
        
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
                
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'ADMINISTRADOR', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN', 'ROLE_CAJERO', 'CAJERO')")
    public ResponseEntity<List<ClienteResponseRecord>> listarClientes() {
        return ResponseEntity.ok(clienteService.obtenerTodos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'ADMINISTRADOR', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN', 'ROLE_CAJERO', 'CAJERO')")
    public ResponseEntity<ClienteResponseRecord> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtenerPorId(id));
    }

    /** El administrador devuelve la contrasena del cliente a la temporal (codigo + CAFE). */
    @PatchMapping("/{id}/reset-password")
    @PreAuthorize(ADMINS)
    public ResponseEntity<com.sedif.sistema_cafeteria.exception.ApiResponse<Void>> resetearPassword(@PathVariable Long id) {
        clienteAuthService.resetearPorAdmin(id);
        return ResponseEntity.ok(com.sedif.sistema_cafeteria.exception.ApiResponse.ok(
                "Contrasena restablecida a la temporal (codigo de empleado + CAFE)."));
    }
}