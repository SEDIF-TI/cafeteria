package com.sedif.sistema_cafeteria.core.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardResource {

    private final DashboardService dashboardService;

    /**
     * Resumen de indicadores. Dos modos:
     *   - por defecto, los ultimos {@code dias} dias (30, maximo 365);
     *   - si se envian {@code desde} y {@code hasta} (ISO yyyy-MM-dd), usa ese rango explicito.
     */
    @GetMapping("/resumen")
    public ResponseEntity<DashboardResponseRecord> resumen(
            @RequestParam(defaultValue = "30") int dias,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        if (desde != null && hasta != null) {
            return ResponseEntity.ok(dashboardService.obtenerResumen(desde, hasta));
        }
        return ResponseEntity.ok(dashboardService.obtenerResumen(dias));
    }
}
