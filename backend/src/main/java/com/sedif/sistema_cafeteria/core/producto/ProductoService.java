package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.categoria.Categoria;
import com.sedif.sistema_cafeteria.core.categoria.CategoriaRepository;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        if (request.esDirecto()) {
            if (request.inventarioId() == null) {
                throw new IllegalArgumentException("Los productos directos deben estar vinculados a un inventario unitario");
            }
            inventario = inventarioRepository.findById(request.inventarioId())
                    .orElseThrow(() -> new EntityNotFoundException("Inventario no encontrado con id: " + request.inventarioId()));
        }

        Producto producto = Producto.builder()
                .nombre(request.nombre())
                .descripcion(request.descripcion())
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
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));

        Categoria categoria = categoriaRepository.findById(request.categoriaId())
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + request.categoriaId()));

        Inventario inventario = null;
        if (request.esDirecto()) {
            if (request.inventarioId() == null) {
                throw new IllegalArgumentException("Los productos directos deben estar vinculados a un inventario unitario");
            }
            inventario = inventarioRepository.findById(request.inventarioId())
                    .orElseThrow(() -> new EntityNotFoundException("Inventario no encontrado con id: " + request.inventarioId()));
        }

        producto.setNombre(request.nombre());
        producto.setDescripcion(request.descripcion());
        producto.setPrecio(request.precio());
        producto.setEsDirecto(request.esDirecto());
        producto.setInventario(inventario);
        producto.setCategoria(categoria);

        return new ProductoResponseRecord(productoRepository.save(producto));
    }

    @Transactional
    public void alternarEstado(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        
        producto.setActivo(!producto.getActivo());
        productoRepository.save(producto);
    }
}