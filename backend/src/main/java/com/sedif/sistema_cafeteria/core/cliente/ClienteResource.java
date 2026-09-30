package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteResource {

    private final ClienteService clienteService;

    // NUEVO ENDPOINT: Obtener todos los clientes para el punto de venta y deudores
    @GetMapping
    public ResponseEntity<List<ClienteResponseRecord>> obtenerTodos() {
        return ResponseEntity.ok(clienteService.obtenerTodosLosClientes());
    }

    @PostMapping("/registro-publico")
    public ResponseEntity<ClienteResponseRecord> registroPublico(@RequestBody @Valid ClienteRequestRecord request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.registrarCliente(request));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<ClienteResponseRecord> loginCliente(@RequestBody @Valid ClienteLoginRequest request) {
        return ResponseEntity.ok(clienteService.loginCliente(request));
    }

    @PostMapping("/auth/restablecer-password")
    public ResponseEntity<String> restablecerPassword(@RequestBody @Valid ClienteResetPasswordRequest request) {
        String nuevaPassword = clienteService.restablecerPassword(request);
        return ResponseEntity.ok(nuevaPassword);
    }

    @GetMapping("/{clienteId}/tickets")
    public ResponseEntity<List<TicketClienteResponseRecord>> obtenerTickets(@PathVariable Long clienteId) {
        return ResponseEntity.ok(clienteService.obtenerTicketsCliente(clienteId));
    }

    @PostMapping("/{clienteId}/abono")
    public ResponseEntity<ClienteResponseRecord> registrarAbono(
            @PathVariable Long clienteId, 
            @RequestBody java.util.Map<String, java.math.BigDecimal> payload) {
        
        java.math.BigDecimal monto = payload.get("monto");
        if (monto == null || monto.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.ok(clienteService.registrarAbono(clienteId, monto));
    }
}