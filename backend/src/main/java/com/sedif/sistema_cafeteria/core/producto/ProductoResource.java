package com.sedif.sistema_cafeteria.core.producto;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/productos")
@RequiredArgsConstructor
public class ProductoResource {

    private final ProductoService productoService;

    @PostMapping
    public ResponseEntity<ProductoResponseRecord> crear(@RequestBody @Valid ProductoRequestRecord request) {
        ProductoResponseRecord response = productoService.crearProducto(request);
        
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
                
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProductoResponseRecord>> listarTodos() {
        return ResponseEntity.ok(productoService.obtenerTodos());
    }

    @GetMapping("/activos")
    public ResponseEntity<List<ProductoResponseRecord>> listarActivos() {
        return ResponseEntity.ok(productoService.obtenerActivos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoResponseRecord> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoResponseRecord> actualizar(
            @PathVariable Long id, 
            @RequestBody @Valid ProductoRequestRecord request) {
        return ResponseEntity.ok(productoService.actualizarProducto(id, request));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Void> alternarEstado(@PathVariable Long id) {
        productoService.alternarEstado(id);
        return ResponseEntity.noContent().build();
    }
}