package com.sedif.sistema_cafeteria.core.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardResource {

    private final DashboardService dashboardService;

    /** Resumen de indicadores de los ultimos {@code dias} dias (por defecto 30, maximo 365). */
    @GetMapping("/resumen")
    public ResponseEntity<DashboardResponseRecord> resumen(@RequestParam(defaultValue = "30") int dias) {
        return ResponseEntity.ok(dashboardService.obtenerResumen(dias));
    }
}
