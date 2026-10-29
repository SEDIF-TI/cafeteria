package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.categoria.Categoria;
import com.sedif.sistema_cafeteria.core.categoria.CategoriaRepository;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.inventario.UnidadMedida;
import com.sedif.sistema_cafeteria.core.recetas.Receta;
import com.sedif.sistema_cafeteria.core.recetas.RecetaRepository;
import com.sedif.sistema_cafeteria.core.recetas.RecetaService;

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
    private final RecetaRepository recetaRepository;
    private final RecetaService recetaService;

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

        TipoProducto tipo = request.tipoProducto();
        boolean esDirecto = (tipo == TipoProducto.DIRECTO);
        // DIRECTO y MATERIA_PRIMA tienen stock propio; PREPARADO se calcula de la receta.
        boolean usaInventarioPropio = (tipo == TipoProducto.DIRECTO || tipo == TipoProducto.MATERIA_PRIMA);

        // La materia prima no se vende: su precio siempre es 0.
        BigDecimal precioVal = (tipo == TipoProducto.MATERIA_PRIMA)
                ? BigDecimal.ZERO
                : (request.precio() != null ? request.precio() : BigDecimal.ZERO);
        BigDecimal costoVal = request.costo() != null ? request.costo() : BigDecimal.ZERO;

        Inventario inventario = null;
        if (usaInventarioPropio) {
            final BigDecimal stockInicial = request.stock() != null ? request.stock() : BigDecimal.ZERO;
            final BigDecimal stockMinimo = request.stockMinimo() != null ? request.stockMinimo() : BigDecimal.ZERO;
            final UnidadMedida unidad = parseUnidadMedida(request.unidadMedida());
            final String nombreInv = "INV-" + request.nombre().trim();

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
        }
        // PREPARADO: inventario queda null (su disponibilidad se calcula de la receta).

        Producto producto = Producto.builder()
                .nombre(request.nombre().trim())
                .descripcion(request.descripcion() != null ? request.descripcion() : "")
                .precio(precioVal)
                .costo(costoVal)
                .tipoProducto(tipo)
                .esDirecto(esDirecto)
                .inventario(inventario)
                .categoria(categoria)
                .build();

        Producto productoGuardado = productoRepository.save(producto);
        guardarRecetaSiAplica(productoGuardado, request);
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

        TipoProducto tipo = request.tipoProducto();
        boolean esDirecto = (tipo == TipoProducto.DIRECTO);
        boolean usaInventarioPropio = (tipo == TipoProducto.DIRECTO || tipo == TipoProducto.MATERIA_PRIMA);

        producto.setNombre(request.nombre().trim());
        producto.setDescripcion(request.descripcion() != null ? request.descripcion() : "");
        producto.setPrecio((tipo == TipoProducto.MATERIA_PRIMA)
                ? BigDecimal.ZERO
                : (request.precio() != null ? request.precio() : BigDecimal.ZERO));
        producto.setTipoProducto(tipo);
        producto.setEsDirecto(esDirecto);
        producto.setCategoria(categoria);

        // Lógica de costo y evaluación para actualización en cascada
        BigDecimal costoAnterior = producto.getCosto();
        BigDecimal nuevoCosto = request.costo() != null ? request.costo() : BigDecimal.ZERO;
        producto.setCosto(nuevoCosto);
        boolean costoCambio = (costoAnterior == null || costoAnterior.compareTo(nuevoCosto) != 0);

        if (usaInventarioPropio) {
            BigDecimal stockVal = request.stock() != null ? request.stock() : BigDecimal.ZERO;
            BigDecimal stockMinVal = request.stockMinimo() != null ? request.stockMinimo() : BigDecimal.ZERO;
            UnidadMedida unidadVal = parseUnidadMedida(request.unidadMedida());
            final String nombreInv = "INV-" + request.nombre().trim();

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
        } else {
            // PREPARADO: no usa inventario propio (su stock viene de la receta).
            producto.setInventario(null);
        }

        Producto productoGuardado = productoRepository.save(producto);
        guardarRecetaSiAplica(productoGuardado, request);

        // Si el costo del insumo cambió, actualizamos los productos padre en cascada
        if (costoCambio) {
            actualizarCostosEnCascada(productoGuardado);
        }

        return new ProductoResponseRecord(productoGuardado, calcularStockDisponible(productoGuardado));
    }

    @Transactional
    public void alternarEstado(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));

        producto.setActivo(!producto.getActivo());
        productoRepository.save(producto);
    }

    /**
     * Guarda la receta enviada junto con un PREPARADO, dentro de la misma transaccion:
     * si un insumo falla, tampoco se crea el producto. La receta recalcula el costo.
     */
    private void guardarRecetaSiAplica(Producto producto, ProductoRequestRecord request) {
        if (producto.getTipoProducto() != TipoProducto.PREPARADO || request.ingredientes() == null) {
            return;
        }
        if (request.ingredientes().isEmpty()) {
            throw new IllegalArgumentException("Agrega al menos un insumo a la receta del producto preparado.");
        }
        recetaService.guardarOActualizarReceta(producto.getId(), request.ingredientes());
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
        TipoProducto tipo = producto.getTipoProducto();
        // PREPARADO calcula su disponibilidad desde la receta; DIRECTO y MATERIA_PRIMA
        // usan su propio inventario. (tipo null = dato aun sin backfill: criterio legacy.)
        boolean usaReceta = (tipo == TipoProducto.PREPARADO)
                || (tipo == null && Boolean.FALSE.equals(producto.getEsDirecto()));
        if (!usaReceta) {
            return (producto.getInventario() != null && producto.getInventario().getStockActual() != null)
                    ? producto.getInventario().getStockActual()
                    : BigDecimal.ZERO;
        }

        List<Receta> receta = recetaRepository.findByProductoPadreId(producto.getId());
        if (receta == null || receta.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal minPorciones = null;

        for (Receta item : receta) {
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

    // Método Privado: Actualización de costos en cascada
    private void actualizarCostosEnCascada(Producto insumo) {
        // Obtenemos todas las recetas donde se usa este insumo
        List<Receta> recetasAfectadas = recetaRepository.findByInsumoId(insumo.getId());
        
        // Obtenemos los productos "Padre" (Ej: Sándwich, Café)
        List<Producto> productosPadre = recetasAfectadas.stream()
                .map(Receta::getProductoPadre)
                .distinct()
                .toList();

        // Recalculamos el costo de cada producto padre
        for (Producto padre : productosPadre) {
            List<Receta> ingredientes = recetaRepository.findByProductoPadreId(padre.getId());
            BigDecimal costoTotal = BigDecimal.ZERO;

            for (Receta r : ingredientes) {
                Producto ing = r.getInsumo();
                BigDecimal costoIng = ing.getCosto() != null ? ing.getCosto() : BigDecimal.ZERO;
                BigDecimal cant = r.getCantidad();
                
                String unidad = ing.getInventario() != null && ing.getInventario().getUnidadMedida() != null 
                        ? ing.getInventario().getUnidadMedida().name() 
                        : "UNIDAD";

                if (unidad.equals("GRAMOS") || unidad.equals("MILILITROS")) {
                    BigDecimal costoPorUnidad = costoIng.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP);
                    costoTotal = costoTotal.add(costoPorUnidad.multiply(cant));
                } else {
                    costoTotal = costoTotal.add(costoIng.multiply(cant));
                }
            }
            
            padre.setCosto(costoTotal.setScale(2, RoundingMode.HALF_UP));
            productoRepository.save(padre);
        }
    }
}