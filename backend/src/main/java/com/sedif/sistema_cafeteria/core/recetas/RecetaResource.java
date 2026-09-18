package com.sedif.sistema_cafeteria.core.recetas;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recetas")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecetaResource {

    private final RecetaService recetaService;

    @GetMapping("/producto/{productoId}")
    public ResponseEntity<List<RecetaResponseDTO>> obtenerReceta(@PathVariable Long productoId) {
        return ResponseEntity.ok(recetaService.obtenerRecetaPorProducto(productoId));
    }

    @PostMapping("/producto/{productoId}")
    public ResponseEntity<List<RecetaResponseDTO>> guardarReceta(
            @PathVariable Long productoId,
            @RequestBody List<IngredienteRequestDTO> ingredientes) {
        return ResponseEntity.ok(recetaService.guardarOActualizarReceta(productoId, ingredientes));
    }
}