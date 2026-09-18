package com.sedif.sistema_cafeteria.core.recetas;

import com.sedif.sistema_cafeteria.core.producto.Producto; // Ajustar importación
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository; // Ajustar importación
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecetaService {

    private final RecetaRepository recetaRepository;
    private final ProductoRepository productoRepository;

    public List<RecetaResponseDTO> obtenerRecetaPorProducto(Long productoPadreId) {
        return recetaRepository.findByProductoPadreId(productoPadreId).stream()
                .map(r -> RecetaResponseDTO.builder()
                        .id(r.getId())
                        .insumoId(r.getInsumo().getId())
                        .insumoNombre(r.getInsumo().getNombre())
                        .cantidad(r.getCantidad())
                        .unidadMedida(r.getInsumo().getInventario() != null 
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
}