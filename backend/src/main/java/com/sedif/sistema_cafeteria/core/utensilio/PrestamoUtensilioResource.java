package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Trazabilidad de los utensilios que salen de la cafeteria hacia las areas del edificio. */
@RestController
@RequestMapping("/api/v1/prestamos-utensilios")
@RequiredArgsConstructor
public class PrestamoUtensilioResource {

    private final UtensilioService utensilioService;

    /** Salida manual (sin venta asociada). */
    @PostMapping
    public ResponseEntity<PrestamoUtensilioResponseRecord> crear(@RequestBody @Valid PrestamoUtensilioRequestRecord request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(utensilioService.crearPrestamo(request));
    }

    /** ?abiertos=true devuelve solo los prestamos con piezas pendientes. */
    @GetMapping
    public ResponseEntity<List<PrestamoUtensilioResponseRecord>> listar(
            @RequestParam(defaultValue = "false") boolean abiertos) {
        return ResponseEntity.ok(utensilioService.listarPrestamos(abiertos));
    }

    @GetMapping("/empleado/{codigo}")
    public ResponseEntity<List<PrestamoUtensilioResponseRecord>> porEmpleado(@PathVariable String codigo) {
        return ResponseEntity.ok(utensilioService.listarPorEmpleado(codigo));
    }

    @PatchMapping("/{id}/devolver")
    public ResponseEntity<PrestamoUtensilioResponseRecord> devolver(
            @PathVariable Long id, @RequestBody(required = false) @Valid DevolucionUtensilioRequestRecord request) {
        return ResponseEntity.ok(utensilioService.devolver(id, request));
    }

    @PatchMapping("/{id}/perdido")
    public ResponseEntity<PrestamoUtensilioResponseRecord> marcarPerdido(
            @PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(utensilioService.marcarPerdido(id, body != null ? body.get("observaciones") : null));
    }
}
