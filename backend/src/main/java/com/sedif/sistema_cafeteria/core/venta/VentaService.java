package com.sedif.sistema_cafeteria.core.venta;

import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.producto.Producto;
import com.sedif.sistema_cafeteria.core.producto.ProductoInsumo;
import com.sedif.sistema_cafeteria.core.producto.ProductoInsumoRepository;
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository;
import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VentaService {

    private final VentaRepository ventaRepository;
    private final ProductoRepository productoRepository;
    private final InventarioRepository inventarioRepository;
    private final ProductoInsumoRepository productoInsumoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public VentaResponseRecord registrarVenta(VentaRequestRecord request) {
        Usuario usuario = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con id: " + request.usuarioId()));

        Venta venta = Venta.builder()
                .usuario(usuario)
                .total(BigDecimal.ZERO)
                .detalles(new ArrayList<>())
                .build();

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVentaRequestRecord itemReq : request.items()) {
            Producto producto = productoRepository.findById(itemReq.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + itemReq.productoId()));

            // Convertir la cantidad del request a BigDecimal para las operaciones
            BigDecimal cantidadItem = BigDecimal.valueOf(itemReq.cantidad());

            BigDecimal subtotal = producto.getPrecio().multiply(cantidadItem);
            totalVenta = totalVenta.add(subtotal);

            // 1. Lógica de Descuento de Inventario
            if (Boolean.TRUE.equals(producto.getEsDirecto())) {
                Inventario inventario = producto.getInventario();
                
                // Usar compareTo: devuelve -1 si el stock actual es menor a la cantidad requerida
                if (inventario.getStockActual().compareTo(cantidadItem) < 0) {
                    throw new IllegalArgumentException("Stock insuficiente para el producto directo: " + producto.getNombre());
                }
                
                // Usar subtract para restar la cantidad
                inventario.setStockActual(inventario.getStockActual().subtract(cantidadItem));
                inventarioRepository.save(inventario);
            } else {
                // Producto compuesto (consume insumos por receta)
                List<ProductoInsumo> receta = productoInsumoRepository.findByProductoId(producto.getId());
                for (ProductoInsumo recetaItem : receta) {
                    Inventario insumo = recetaItem.getInsumo();
                    
                    // Convertir la cantidad requerida (Double) a BigDecimal y multiplicar
                    BigDecimal cantidadReqInsumo = BigDecimal.valueOf(recetaItem.getCantidadRequerida());
                    BigDecimal cantidadRequeridaTotal = cantidadReqInsumo.multiply(cantidadItem);

                    // Validar stock usando compareTo
                    if (insumo.getStockActual().compareTo(cantidadRequeridaTotal) < 0) {
                        throw new IllegalArgumentException("Stock insuficiente en insumo de receta: " + insumo.getNombre());
                    }
                    
                    // Restar del inventario usando subtract
                    insumo.setStockActual(insumo.getStockActual().subtract(cantidadRequeridaTotal));
                    inventarioRepository.save(insumo);
                }
            }

            // 2. Construir el detalle de venta
            DetalleVenta detalle = DetalleVenta.builder()
                    .venta(venta)
                    .producto(producto)
                    .cantidad(itemReq.cantidad())
                    .precioUnitario(producto.getPrecio())
                    .subtotal(subtotal)
                    .build();

            venta.getDetalles().add(detalle);
        }

        venta.setTotal(totalVenta);
        Venta ventaGuardada = ventaRepository.save(venta);

        return new VentaResponseRecord(ventaGuardada);
    }

    @Transactional(readOnly = true)
    public List<VentaResponseRecord> obtenerTodas() {
        return ventaRepository.findAll().stream()
                .map(VentaResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public VentaResponseRecord obtenerPorId(Long id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con id: " + id));
        return new VentaResponseRecord(venta);
    }
}