package com.sedif.sistema_cafeteria.core.producto;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/productos/{productoId}/receta")
@RequiredArgsConstructor
public class ProductoInsumoResource {

    private final ProductoInsumoService productoInsumoService;

    @PostMapping
    public ResponseEntity<ProductoInsumoResponseRecord> agregarInsumo(
            @PathVariable Long productoId,
            @RequestBody @Valid ProductoInsumoRequestRecord request) {
        
        ProductoInsumoResponseRecord response = productoInsumoService.agregarInsumoAReceta(productoId, request);

        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/productos/{productoId}/receta/{id}")
                .buildAndExpand(productoId, response.id())
                .toUri();

        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProductoInsumoResponseRecord>> listarReceta(@PathVariable Long productoId) {
        return ResponseEntity.ok(productoInsumoService.obtenerRecetaPorProducto(productoId));
    }

    @DeleteMapping("/{recetaId}")
    public ResponseEntity<Void> eliminarInsumo(@PathVariable Long productoId, @PathVariable Long recetaId) {
        productoInsumoService.eliminarInsumoDeReceta(recetaId);
        return ResponseEntity.noContent().build();
    }
}