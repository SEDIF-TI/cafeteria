package com.sedif.sistema_cafeteria.core.caja;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/turnos")
@RequiredArgsConstructor
public class TurnoResource {

    private final TurnoService turnoService;

    @PostMapping("/abrir")
    public ResponseEntity<TurnoResponse> abrirTurno(
            @RequestBody @Valid AperturaTurnoRequest request, Authentication authentication) {
        return ResponseEntity.ok(turnoService.abrirTurno(authentication.getName(), request.fondoCaja()));
    }

    @PostMapping("/cerrar")
    public ResponseEntity<TurnoResponse> cerrarTurno(@RequestBody @Valid CierreTurnoRequest request) {
        return ResponseEntity.ok(turnoService.cerrarTurno(
                request.totalContado(), request.autorizadorUsuario(), request.autorizadorPassword(), request.motivo()));
    }

    /** Corrige el arqueo de un corte ya cerrado (requiere autorización de administrador). */
    @PatchMapping("/{id}/corregir")
    public ResponseEntity<TurnoResponse> corregirCorte(
            @PathVariable Long id, @RequestBody @Valid CierreTurnoRequest request) {
        return ResponseEntity.ok(turnoService.corregirCorte(
                id, request.totalContado(), request.autorizadorUsuario(), request.autorizadorPassword(), request.motivo()));
    }

    /** Turno abierto actual, o 204 si no hay ninguno. */
    @GetMapping("/activo")
    public ResponseEntity<TurnoResponse> turnoActivo() {
        return turnoService.obtenerTurnoActivo()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Historial de cortes (turnos cerrados). */
    @GetMapping
    public ResponseEntity<List<TurnoResponse>> historial() {
        return ResponseEntity.ok(turnoService.historialCortes());
    }
}
