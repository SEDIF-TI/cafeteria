package com.sedif.sistema_cafeteria.core.recetas;

import com.sedif.sistema_cafeteria.core.producto.Producto;
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecetaService {

    private final RecetaRepository recetaRepository;
    private final ProductoRepository productoRepository;

    @Transactional(readOnly = true)
    public List<RecetaResponseDTO> obtenerRecetaPorProducto(Long productoPadreId) {
        return recetaRepository.findByProductoPadreId(productoPadreId).stream()
                .map(r -> RecetaResponseDTO.builder()
                        .id(r.getId())
                        .insumoId(r.getInsumo().getId())
                        .insumoNombre(r.getInsumo().getNombre())
                        .cantidad(r.getCantidad())
                        .unidadMedida(r.getInsumo().getInventario() != null && r.getInsumo().getInventario().getUnidadMedida() != null
                                ? r.getInsumo().getInventario().getUnidadMedida().toString() 
                                : "UNIDAD")
                        .build())
                .toList();
    }

    @Transactional
    public List<RecetaResponseDTO> guardarOActualizarReceta(Long productoPadreId, List<IngredienteRequestDTO> ingredientes) {
        Producto productoPadre = productoRepository.findById(productoPadreId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoPadreId));

        recetaRepository.deleteByProductoPadreId(productoPadreId);

        // Se consolidan los insumos repetidos sumando sus cantidades: asi la receta
        // no termina con dos lineas del mismo insumo (p.ej. Harina 250g + Harina 5g).
        java.util.LinkedHashMap<Long, BigDecimal> cantidadPorInsumo = new java.util.LinkedHashMap<>();
        for (IngredienteRequestDTO dto : ingredientes) {
            if (dto.getCantidad() == null || dto.getCantidad().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("La cantidad del insumo debe ser mayor a cero.");
            }
            cantidadPorInsumo.merge(dto.getInsumoId(), dto.getCantidad(), BigDecimal::add);
        }

        List<Receta> nuevasRecetas = cantidadPorInsumo.entrySet().stream().map(entrada -> {
            Producto insumo = productoRepository.findById(entrada.getKey())
                    .orElseThrow(() -> new RuntimeException("Insumo no encontrado: " + entrada.getKey()));
            if (insumo.getId().equals(productoPadreId)) {
                throw new IllegalArgumentException("Un producto no puede ser insumo de si mismo.");
            }
            return Receta.builder()
                    .productoPadre(productoPadre)
                    .insumo(insumo)
                    .cantidad(entrada.getValue())
                    .build();
        }).toList();

        recetaRepository.saveAll(nuevasRecetas);
        
        // NUEVO: Calcular costo de fabricación de la receta guardada
        recalcularCostoProductoPadre(productoPadre, nuevasRecetas);

        return obtenerRecetaPorProducto(productoPadreId);
    }

    @Transactional(readOnly = true)
    public List<RecetaResumenDTO> obtenerResumenRecetas() {
        List<Receta> todasLasRecetas = recetaRepository.findAll();
        if (todasLasRecetas.isEmpty()) {
            return new ArrayList<>();
        }

        List<Producto> productosConReceta = todasLasRecetas.stream()
                .map(Receta::getProductoPadre)
                .filter(p -> p != null && p.getId() != null)
                .distinct()
                .toList();

        List<RecetaResumenDTO> resumenes = new ArrayList<>();

        for (Producto producto : productosConReceta) {
            List<Receta> ingredientes = recetaRepository.findByProductoPadreId(producto.getId());

            long minPorciones = Long.MAX_VALUE;
            String insumoCritico = "Sin insumos registrados";

            for (Receta r : ingredientes) {
                if (r == null || r.getInsumo() == null) continue;

                BigDecimal stockActual = BigDecimal.ZERO;
                if (r.getInsumo().getInventario() != null && r.getInsumo().getInventario().getStockActual() != null) {
                    stockActual = r.getInsumo().getInventario().getStockActual();
                }

                BigDecimal cantidadRequerida = r.getCantidad();

                if (cantidadRequerida != null && cantidadRequerida.compareTo(BigDecimal.ZERO) > 0) {
                    long alcanzable = 0;
                    if (stockActual.compareTo(BigDecimal.ZERO) > 0) {
                        alcanzable = stockActual.divideToIntegralValue(cantidadRequerida).longValue();
                    }

                    if (alcanzable < minPorciones) {
                        minPorciones = alcanzable;
                        insumoCritico = r.getInsumo().getNombre() + " (" + stockActual + " disp.)";
                    }
                }
            }

            if (minPorciones == Long.MAX_VALUE) {
                minPorciones = 0;
            }

            resumenes.add(RecetaResumenDTO.builder()
                    .productoId(producto.getId())
                    .productoNombre(producto.getNombre())
                    .precio(producto.getPrecio() != null ? producto.getPrecio().doubleValue() : 0.0)
                    .totalIngredientes(ingredientes.size())
                    .porcionesDisponibles(minPorciones)
                    .insumoLimitante(insumoCritico)
                    .build());
        }

        return resumenes;
    }

    private void recalcularCostoProductoPadre(Producto productoPadre, List<Receta> ingredientes) {
        BigDecimal costoTotal = BigDecimal.ZERO;

        for (Receta r : ingredientes) {
            Producto insumo = r.getInsumo();
            BigDecimal costoInsumo = insumo.getCosto() != null ? insumo.getCosto() : BigDecimal.ZERO;
            BigDecimal cantidadUsada = r.getCantidad();
            
            String unidad = insumo.getInventario() != null && insumo.getInventario().getUnidadMedida() != null 
                    ? insumo.getInventario().getUnidadMedida().name() 
                    : "UNIDAD";

            if (unidad.equals("GRAMOS") || unidad.equals("MILILITROS")) {
                // Divide el costo del kilo/litro entre 1000 para sacar el costo por gramo/ml
                BigDecimal costoPorUnidad = costoInsumo.divide(new BigDecimal("1000"), 6, java.math.RoundingMode.HALF_UP);
                costoTotal = costoTotal.add(costoPorUnidad.multiply(cantidadUsada));
            } else {
                costoTotal = costoTotal.add(costoInsumo.multiply(cantidadUsada));
            }
        }

        productoPadre.setCosto(costoTotal.setScale(2, java.math.RoundingMode.HALF_UP));
        productoRepository.save(productoPadre);
    }
}