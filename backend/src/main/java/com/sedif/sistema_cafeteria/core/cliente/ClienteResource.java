package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/clientes") // Esta es tu ruta base definitiva
@RequiredArgsConstructor
public class ClienteResource {

    private final ClienteService clienteService;

    // Quitamos "/registro-publico" para que escuche el POST directamente en la ruta base
    @PostMapping
    public ResponseEntity<ClienteResponseRecord> registrarCliente(@RequestBody @Valid ClienteRequestRecord request) {
        ClienteResponseRecord response = clienteService.registrarCliente(request);
        
        // El estándar REST recomienda devolver la URI del nuevo recurso en los headers
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
                
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ClienteResponseRecord>> listarClientes() {
        return ResponseEntity.ok(clienteService.obtenerTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClienteResponseRecord> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtenerPorId(id));
    }
}