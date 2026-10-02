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

        List<Receta> nuevasRecetas = ingredientes.stream().map(dto -> {
            Producto insumo = productoRepository.findById(dto.getInsumoId())
                    .orElseThrow(() -> new RuntimeException("Insumo no encontrado: " + dto.getInsumoId()));

            if (dto.getCantidad() == null || dto.getCantidad().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("La cantidad del insumo debe ser mayor a cero.");
            }

            return Receta.builder()
                    .productoPadre(productoPadre)
                    .insumo(insumo)
                    .cantidad(dto.getCantidad())
                    .build();
        }).toList();

        recetaRepository.saveAll(nuevasRecetas);
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
}