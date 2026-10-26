package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.recetas.RecetaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Migracion de datos: rellena {@code tipoProducto} en los productos existentes
 * que todavia lo tengan en null (los creados antes de introducir el enum).
 *
 * Criterio (a partir del antiguo esDirecto + si es cabeza de receta):
 *   - esDirecto = true                         -> DIRECTO
 *   - esDirecto = false y ES cabeza de receta  -> PREPARADO
 *   - esDirecto = false y NO es cabeza de receta -> MATERIA_PRIMA
 *
 * Es idempotente: una vez migrados, no vuelve a tocar nada (no hay filas en null).
 */
@Component
@RequiredArgsConstructor
public class BackfillTipoProducto implements CommandLineRunner {

    private final ProductoRepository productoRepository;
    private final RecetaRepository recetaRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<Producto> sinTipo = productoRepository.findAll().stream()
                .filter(p -> p.getTipoProducto() == null)
                .toList();

        if (sinTipo.isEmpty()) {
            return;
        }

        for (Producto p : sinTipo) {
            TipoProducto tipo;
            if (Boolean.TRUE.equals(p.getEsDirecto())) {
                tipo = TipoProducto.DIRECTO;
            } else {
                boolean esCabezaDeReceta = !recetaRepository.findByProductoPadreId(p.getId()).isEmpty();
                tipo = esCabezaDeReceta ? TipoProducto.PREPARADO : TipoProducto.MATERIA_PRIMA;
            }
            p.setTipoProducto(tipo);
        }

        productoRepository.saveAll(sinTipo);
    }
}
