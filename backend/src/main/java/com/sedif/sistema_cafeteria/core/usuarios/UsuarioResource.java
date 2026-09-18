package com.sedif.sistema_cafeteria.core.usuarios;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioResource {

    private final UsuarioService usuarioService;

    public UsuarioResource(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<UsuarioResponse>> listarTodos() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> crear(@Valid @RequestBody UsuarioRequest request) {
        UsuarioResponse response = usuarioService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> cambiarEstado(
            @PathVariable Long id,
            @RequestBody boolean activo) {
        UsuarioResponse response = usuarioService.cambiarEstado(id, activo);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'ROLE_ADMINISTRADOR', 'ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioRequest request) {
        UsuarioResponse response = usuarioService.actualizar(id, request);
        return ResponseEntity.ok(response);
    }
}