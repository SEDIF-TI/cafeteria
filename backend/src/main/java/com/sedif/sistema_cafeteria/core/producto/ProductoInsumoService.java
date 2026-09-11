package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
// Línea eliminada aquí

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoInsumoService {

    private final ProductoInsumoRepository productoInsumoRepository;
    private final ProductoRepository productoRepository;
    private final InventarioRepository inventarioRepository;

    @Transactional
    public ProductoInsumoResponseRecord agregarInsumoAReceta(Long productoId, ProductoInsumoRequestRecord request) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + productoId));

        if (Boolean.TRUE.equals(producto.getEsDirecto())) {
            throw new IllegalArgumentException("Un producto directo no puede tener una receta de insumos a granel");
        }

        Inventario insumo = inventarioRepository.findById(request.inventarioId())
                .orElseThrow(() -> new EntityNotFoundException("Insumo de inventario no encontrado con id: " + request.inventarioId()));

        ProductoInsumo productoInsumo = ProductoInsumo.builder()
                .producto(producto)
                .insumo(insumo)
                .cantidadRequerida(request.cantidadRequerida())
                .build();

        return new ProductoInsumoResponseRecord(productoInsumoRepository.save(productoInsumo));
    }

    @Transactional(readOnly = true)
    public List<ProductoInsumoResponseRecord> obtenerRecetaPorProducto(Long productoId) {
        if (!productoRepository.existsById(productoId)) {
            throw new EntityNotFoundException("Producto no encontrado con id: " + productoId);
        }
        return productoInsumoRepository.findByProductoId(productoId).stream()
                .map(ProductoInsumoResponseRecord::new)
                .toList();
    }

    @Transactional
    public void eliminarInsumoDeReceta(Long recetaId) {
        if (!productoInsumoRepository.existsById(recetaId)) {
            throw new EntityNotFoundException("Elemento de receta no encontrado con id: " + recetaId);
        }
        productoInsumoRepository.deleteById(recetaId);
    }
}