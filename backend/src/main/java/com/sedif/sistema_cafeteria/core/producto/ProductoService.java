package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.categoria.Categoria;
import com.sedif.sistema_cafeteria.core.categoria.CategoriaRepository;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.inventario.UnidadMedida;
import com.sedif.sistema_cafeteria.core.recetas.Receta;
import com.sedif.sistema_cafeteria.core.recetas.RecetaRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final InventarioRepository inventarioRepository;
    private final RecetaRepository recetaRepository; // Inyección corregida a RecetaRepository

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

        Producto productoGuardado = productoRepository.save(producto);
        return new ProductoResponseRecord(productoGuardado, calcularStockDisponible(productoGuardado));
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseRecord> obtenerTodos() {
        return productoRepository.findAll().stream()
                .map(producto -> new ProductoResponseRecord(producto, calcularStockDisponible(producto)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseRecord> obtenerActivos() {
        return productoRepository.findByActivoTrue().stream()
                .map(producto -> new ProductoResponseRecord(producto, calcularStockDisponible(producto)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductoResponseRecord obtenerPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        return new ProductoResponseRecord(producto, calcularStockDisponible(producto));
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
        return new ProductoResponseRecord(productoGuardado, calcularStockDisponible(productoGuardado));
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

        if (str.contains("LITRO") || str.contains("MILILITRO") || str.equals("ML") || str.equals("L")) {
            return UnidadMedida.MILILITROS;
        }
        if (str.contains("GRAMO") || str.contains("KILO") || str.equals("KG") || str.equals("G")) {
            return UnidadMedida.GRAMOS;
        }
        if (str.contains("UNIDAD") || str.contains("PIEZA") || str.equals("PZA") || str.equals("U")) {
            return UnidadMedida.UNIDAD;
        }

        for (UnidadMedida um : UnidadMedida.values()) {
            if (um.name().equalsIgnoreCase(str)) {
                return um;
            }
        }
        
        return UnidadMedida.UNIDAD;
    }

    public BigDecimal calcularStockDisponible(Producto producto) {
        if (Boolean.TRUE.equals(producto.getEsDirecto())) {
            return (producto.getInventario() != null && producto.getInventario().getStockActual() != null)
                    ? producto.getInventario().getStockActual()
                    : BigDecimal.ZERO;
        }

        // Búsqueda en la tabla recetas a través del producto padre
        List<Receta> receta = recetaRepository.findByProductoPadreId(producto.getId());
        if (receta == null || receta.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal minPorciones = null;

        for (Receta item : receta) {
            // Acceso correcto al stock desde el inventario del producto materia prima
            if (item.getInsumo() == null 
                    || item.getInsumo().getInventario() == null 
                    || item.getInsumo().getInventario().getStockActual() == null) {
                return BigDecimal.ZERO;
            }

            BigDecimal stockInsumo = item.getInsumo().getInventario().getStockActual();
            BigDecimal cantidadRequerida = item.getCantidad(); 

            if (cantidadRequerida == null || cantidadRequerida.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal porcionesPosibles = stockInsumo.divide(cantidadRequerida, 0, RoundingMode.FLOOR);

            if (minPorciones == null || porcionesPosibles.compareTo(minPorciones) < 0) {
                minPorciones = porcionesPosibles;
            }
        }

        return minPorciones != null ? minPorciones : BigDecimal.ZERO;
    }
}