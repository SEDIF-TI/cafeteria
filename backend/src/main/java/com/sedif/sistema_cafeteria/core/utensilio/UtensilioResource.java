package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/** Catalogo de utensilios. Alta y edicion reservadas a administradores. */
@RestController
@RequestMapping("/api/v1/utensilios")
@RequiredArgsConstructor
public class UtensilioResource {

    private static final String ADMINS = "hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', "
            + "'ROLE_ADMINISTRADOR', 'ADMINISTRADOR', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')";

    private final UtensilioService utensilioService;

    @PostMapping
    @PreAuthorize(ADMINS)
    public ResponseEntity<UtensilioResponseRecord> crear(@RequestBody @Valid UtensilioRequestRecord request) {
        UtensilioResponseRecord response = utensilioService.crear(request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping
    public ResponseEntity<List<UtensilioResponseRecord>> listar() {
        return ResponseEntity.ok(utensilioService.listar(false));
    }

    @GetMapping("/activos")
    public ResponseEntity<List<UtensilioResponseRecord>> listarActivos() {
        return ResponseEntity.ok(utensilioService.listar(true));
    }

    @PutMapping("/{id}")
    @PreAuthorize(ADMINS)
    public ResponseEntity<UtensilioResponseRecord> actualizar(@PathVariable Long id,
                                                              @RequestBody @Valid UtensilioRequestRecord request) {
        return ResponseEntity.ok(utensilioService.actualizar(id, request));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(ADMINS)
    public ResponseEntity<Void> cambiarEstado(@PathVariable Long id) {
        utensilioService.cambiarEstado(id);
        return ResponseEntity.noContent().build();
    }
}
