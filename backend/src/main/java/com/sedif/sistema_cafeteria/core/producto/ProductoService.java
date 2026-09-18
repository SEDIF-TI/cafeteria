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
        if (request.nombre() == null || request.nombre().isBlank()) {
            throw new IllegalArgumentException("El nombre del producto no puede estar vacío.");
        }

        if (productoRepository.findByNombre(request.nombre().trim()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un producto con ese nombre.");
        }

        if (request.categoriaId() == null) {
            throw new IllegalArgumentException("Debes seleccionar una categoría válida.");
        }

        Categoria categoria = categoriaRepository.findById(request.categoriaId())
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + request.categoriaId()));

        BigDecimal precioVal = request.precio() != null ? request.precio() : BigDecimal.ZERO;
        BigDecimal stockInicial = request.stock() != null ? request.stock() : BigDecimal.ZERO;
        BigDecimal stockMinimo = request.stockMinimo() != null ? request.stockMinimo() : BigDecimal.ZERO;
        UnidadMedida unidad = parseUnidadMedida(request.unidadMedida());
        String nombreInv = "INV-" + request.nombre().trim();

        Inventario inventario;
        if (request.inventarioId() != null) {
            inventario = inventarioRepository.findById(request.inventarioId())
                    .orElseThrow(() -> new EntityNotFoundException("Inventario no encontrado con id: " + request.inventarioId()));
        } else {
            inventario = inventarioRepository.findByNombre(nombreInv)
                    .orElseGet(() -> Inventario.builder()
                            .nombre(nombreInv)
                            .unidadMedida(unidad)
                            .stockActual(stockInicial)
                            .stockMinimo(stockMinimo)
                            .activo(true)
                            .build());

            inventario.setStockActual(stockInicial);
            inventario.setStockMinimo(stockMinimo);
            inventario.setUnidadMedida(unidad);
            inventario = inventarioRepository.save(inventario);
        }

        Producto producto = Producto.builder()
                .nombre(request.nombre().trim())
                .descripcion(request.descripcion() != null ? request.descripcion() : "")
                .precio(precioVal)
                .esDirecto(Boolean.TRUE.equals(request.esDirecto()))
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

        if (request.categoriaId() == null) {
            throw new IllegalArgumentException("Debes seleccionar una categoría válida.");
        }

        Categoria categoria = categoriaRepository.findById(request.categoriaId())
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + request.categoriaId()));

        producto.setNombre(request.nombre().trim());
        producto.setDescripcion(request.descripcion() != null ? request.descripcion() : "");
        producto.setPrecio(request.precio() != null ? request.precio() : BigDecimal.ZERO);
        producto.setEsDirecto(Boolean.TRUE.equals(request.esDirecto()));
        producto.setCategoria(categoria);

        BigDecimal stockVal = request.stock() != null ? request.stock() : BigDecimal.ZERO;
        BigDecimal stockMinVal = request.stockMinimo() != null ? request.stockMinimo() : BigDecimal.ZERO;
        UnidadMedida unidadVal = parseUnidadMedida(request.unidadMedida());
        String nombreInv = "INV-" + request.nombre().trim();

        Inventario inventario = producto.getInventario();

        if (inventario == null) {
            inventario = inventarioRepository.findByNombre(nombreInv)
                    .orElseGet(() -> Inventario.builder()
                            .nombre(nombreInv)
                            .activo(true)
                            .build());
        }

        inventario.setNombre(nombreInv);
        inventario.setStockActual(stockVal);
        inventario.setStockMinimo(stockMinVal);
        inventario.setUnidadMedida(unidadVal);

        inventario = inventarioRepository.save(inventario);
        producto.setInventario(inventario);

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

    private UnidadMedida parseUnidadMedida(Object unidadInput) {
        if (unidadInput == null) {
            return UnidadMedida.UNIDAD;
        }
        if (unidadInput instanceof UnidadMedida um) {
            return um;
        }

        String str = unidadInput.toString().trim().toUpperCase();

        // Mapeo seguro para líquidos (Litros / Mililitros)
        if (str.contains("LITRO") || str.contains("MILILITRO") || str.equals("ML") || str.equals("L")) {
            return UnidadMedida.MILILITROS;
        }
        // Mapeo seguro para sólidos / peso (Kilos / Gramos)
        if (str.contains("GRAMO") || str.contains("KILO") || str.equals("KG") || str.equals("G")) {
            return UnidadMedida.GRAMOS;
        }
        // Mapeo seguro para unidades / piezas
        if (str.contains("UNIDAD") || str.contains("PIEZA") || str.equals("PZA") || str.equals("U")) {
            return UnidadMedida.UNIDAD;
        }

        // Búsqueda directa por coincidencia en el Enum
        for (UnidadMedida um : UnidadMedida.values()) {
            if (um.name().equalsIgnoreCase(str)) {
                return um;
            }
        }
        
        return UnidadMedida.UNIDAD;
    }
}