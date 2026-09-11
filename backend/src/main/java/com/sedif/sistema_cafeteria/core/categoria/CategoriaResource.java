package com.sedif.sistema_cafeteria.core.categoria;

import com.sedif.sistema_cafeteria.core.categoria.CategoriaRequestRecord;
import com.sedif.sistema_cafeteria.core.categoria.CategoriaResponseRecord;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/categorias")
@RequiredArgsConstructor
public class CategoriaResource {

    private final CategoriaService categoriaService;

    @PostMapping
    public ResponseEntity<CategoriaResponseRecord> crear(@RequestBody @Valid CategoriaRequestRecord request) {
        CategoriaResponseRecord response = categoriaService.crearCategoria(request);
        
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
                
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public ResponseEntity<List<CategoriaResponseRecord>> listarTodas() {
        return ResponseEntity.ok(categoriaService.obtenerTodas());
    }

    @GetMapping("/activas")
    public ResponseEntity<List<CategoriaResponseRecord>> listarActivas() {
        return ResponseEntity.ok(categoriaService.obtenerActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoriaResponseRecord> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(categoriaService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaResponseRecord> actualizar(
            @PathVariable Long id, 
            @RequestBody @Valid CategoriaRequestRecord request) {
        return ResponseEntity.ok(categoriaService.actualizarCategoria(id, request));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Void> alternarEstado(@PathVariable Long id) {
        categoriaService.alternarEstado(id);
        return ResponseEntity.noContent().build();
    }
}