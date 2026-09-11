package com.sedif.sistema_cafeteria.core.inventario;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/inventario")
@RequiredArgsConstructor
public class InventarioResource {

    private final InventarioService inventarioService;

    @PostMapping
    public ResponseEntity<InventarioResponseRecord> crear(@RequestBody @Valid InventarioRequestRecord request) {
        InventarioResponseRecord response = inventarioService.crearInventario(request);
        
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
                
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public ResponseEntity<List<InventarioResponseRecord>> listarTodos() {
        return ResponseEntity.ok(inventarioService.obtenerTodos());
    }

    @GetMapping("/activos")
    public ResponseEntity<List<InventarioResponseRecord>> listarActivos() {
        return ResponseEntity.ok(inventarioService.obtenerActivos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventarioResponseRecord> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(inventarioService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventarioResponseRecord> actualizar(
            @PathVariable Long id, 
            @RequestBody @Valid InventarioRequestRecord request) {
        return ResponseEntity.ok(inventarioService.actualizarInventario(id, request));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Void> alternarEstado(@PathVariable Long id) {
        inventarioService.alternarEstado(id);
        return ResponseEntity.noContent().build();
    }
}