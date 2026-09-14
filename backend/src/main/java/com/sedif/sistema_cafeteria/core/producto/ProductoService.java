package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.categoria.Categoria;
import com.sedif.sistema_cafeteria.core.categoria.CategoriaRepository;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.inventario.UnidadMedida;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final InventarioRepository inventarioRepository;

    @Transactional
    public ProductoResponseRecord crearProducto(ProductoRequestRecord request) {
        if (productoRepository.findByNombre(request.nombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un producto con ese nombre");
        }

        Categoria categoria = categoriaRepository.findById(request.categoriaId())
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + request.categoriaId()));

        Inventario inventario = null;
        if (Boolean.TRUE.equals(request.esDirecto())) {
            if (request.inventarioId() != null) {
                inventario = inventarioRepository.findById(request.inventarioId())
                        .orElseThrow(() -> new EntityNotFoundException("Inventario no encontrado con id: " + request.inventarioId()));
            } else {
                BigDecimal stockInicial = request.stock() != null ? request.stock() : BigDecimal.ZERO;
                BigDecimal stockMinimo = request.stockMinimo() != null ? request.stockMinimo() : BigDecimal.ZERO;

                inventario = Inventario.builder()
                        .nombre("INV-" + request.nombre().trim())
                        .unidadMedida(UnidadMedida.UNIDAD)
                        .stockActual(stockInicial)
                        .stockMinimo(stockMinimo)
                        .activo(true)
                        .build();

                inventario = inventarioRepository.save(inventario);
            }
        }

        Producto producto = Producto.builder()
                .nombre(request.nombre())
                .descripcion(request.descripcion() != null ? request.descripcion() : "")
                .precio(request.precio())
                .esDirecto(request.esDirecto())
                .inventario(inventario)
                .categoria(categoria)
                .build();

        return new ProductoResponseRecord(productoRepository.save(producto));
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseRecord> obtenerTodos() {
        return productoRepository.findAll().stream()
                .map(ProductoResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseRecord> obtenerActivos() {
        return productoRepository.findByActivoTrue().stream()
                .map(ProductoResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductoResponseRecord obtenerPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        return new ProductoResponseRecord(producto);
    }

    @Transactional
    public ProductoResponseRecord actualizarProducto(Long id, ProductoRequestRecord request) {
        Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        producto.setNombre(request.nombre());
        producto.getDescripcion(); // Actualiza la descripción
        producto.setDescripcion(request.descripcion());
        producto.setPrecio(request.precio());
        producto.setEsDirecto(request.esDirecto());

        // Actualización de Inventario si es venta directa
        if (Boolean.TRUE.equals(request.esDirecto())) {
            Inventario inventario = producto.getInventario();

            if (inventario == null) {
                inventario = Inventario.builder()
                    .nombre(request.nombre())
                    .unidadMedida(UnidadMedida.UNIDAD)
                    .build();
            }

            // ASIGNACIÓN CLAVE:
            inventario.setStockActual(request.stock() != null ? request.stock() : BigDecimal.ZERO);
            inventario.setStockMinimo(request.stockMinimo() != null ? request.stockMinimo() : BigDecimal.ZERO);

            producto.setInventario(inventario);
        }

        Producto productoGuardado = productoRepository.save(producto);
        return new ProductoResponseRecord(productoGuardado);
    }

    @Transactional
    public void alternarEstado(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        
        producto.setActivo(!producto.getActivo());
        productoRepository.save(producto);
    }
}