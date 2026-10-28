package com.sedif.sistema_cafeteria.core.utensilio;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Asegura que existan los utensilios del "kit estandar" que se entrega con cada
 * comida (plato, vaso, cuchara, cuchillo, tenedor y charola).
 *
 * Como el control es por UBICACION (no por escasez de piezas) y ya no hay
 * pantalla para administrar el stock por pieza, el stock nunca debe bloquear una
 * venta: se crean con un stock muy alto y, si ya existían con su stock físico
 * (p. ej. 60 platos), se eleva conservando las piezas que estén prestadas.
 * También se mantienen activas, porque una pieza inactiva haría fallar el kit.
 * Es idempotente: tras la primera corrida no vuelve a cambiar nada.
 */
@Component
@RequiredArgsConstructor
public class SeedUtensiliosEstandar implements CommandLineRunner {

    private final UtensilioRepository utensilioRepository;

    /** Debe coincidir con el kit que arma UtensilioService. */
    static final List<String> KIT_BASE = List.of("Plato", "Vaso", "Cuchara", "Cuchillo", "Tenedor");
    static final String CHAROLA = "Charola";

    private static final int STOCK_ALTO = 1_000_000;

    private static int nz(Integer v) {
        return v != null ? v : 0;
    }

    @Override
    @Transactional
    public void run(String... args) {
        List<String> estandar = new java.util.ArrayList<>(KIT_BASE);
        estandar.add(CHAROLA);
        for (String nombre : estandar) {
            var existente = utensilioRepository.findByNombreIgnoreCase(nombre);
            if (existente.isEmpty()) {
                utensilioRepository.save(Utensilio.builder()
                        .nombre(nombre)
                        .stockTotal(STOCK_ALTO)
                        .stockDisponible(STOCK_ALTO)
                        .build());
                continue;
            }
            Utensilio u = existente.get();
            boolean stockBajo = u.getStockTotal() == null || u.getStockTotal() < STOCK_ALTO;
            boolean inactivo = !Boolean.TRUE.equals(u.getActivo());
            if (stockBajo || inactivo) {
                if (stockBajo) {
                    int enPrestamo = Math.max(0, nz(u.getStockTotal()) - nz(u.getStockDisponible()));
                    u.setStockTotal(STOCK_ALTO);
                    u.setStockDisponible(STOCK_ALTO - enPrestamo);
                }
                u.setActivo(true);
                utensilioRepository.save(u);
            }
        }
    }
}
