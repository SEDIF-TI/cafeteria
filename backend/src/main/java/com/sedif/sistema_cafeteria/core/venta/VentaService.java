package com.sedif.sistema_cafeteria.core.venta;

import com.sedif.sistema_cafeteria.core.cliente.Cliente;
import com.sedif.sistema_cafeteria.core.cliente.ClienteRepository;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.producto.Producto;
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository;
import com.sedif.sistema_cafeteria.core.recetas.Receta;
import com.sedif.sistema_cafeteria.core.recetas.RecetaRepository;
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
    private final RecetaRepository recetaRepository; // <--- Cambiado de ProductoInsumoRepository
    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;

    @Transactional
    public VentaResponseRecord registrarVenta(VentaRequestRecord request) {
        Usuario usuario = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con id: " + request.usuarioId()));

        Cliente cliente = null;
        if (request.clienteId() != null) {
            cliente = clienteRepository.findById(request.clienteId())
                    .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + request.clienteId()));
        }

        EstadoPago estado = request.estadoPago() != null ? request.estadoPago() : EstadoPago.PAGADO;

        Venta venta = Venta.builder()
                .usuario(usuario)
                .cliente(cliente)
                .estadoPago(estado)
                .total(BigDecimal.ZERO)
                .detalles(new ArrayList<>())
                .build();

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVentaRequestRecord itemReq : request.items()) {
            Producto producto = productoRepository.findById(itemReq.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + itemReq.productoId()));

            BigDecimal cantidadItem = BigDecimal.valueOf(itemReq.cantidad());
            BigDecimal subtotal = producto.getPrecio().multiply(cantidadItem);
            totalVenta = totalVenta.add(subtotal);

            // 1. Descuento de Inventario
            if (Boolean.TRUE.equals(producto.getEsDirecto())) {
                Inventario inventario = producto.getInventario();
                if (inventario == null) {
                    throw new EntityNotFoundException("El producto directo " + producto.getNombre() + " no tiene inventario asignado.");
                }
                if (inventario.getStockActual().compareTo(cantidadItem) < 0) {
                    throw new IllegalArgumentException("Stock insuficiente para el producto directo: " + producto.getNombre());
                }
                inventario.setStockActual(inventario.getStockActual().subtract(cantidadItem));
                inventarioRepository.save(inventario);
            } else {
                // Búsqueda alineada con RecetaRepository y la estructura Receta
                List<Receta> receta = recetaRepository.findByProductoPadreId(producto.getId());
                
                if (receta.isEmpty()) {
                    throw new IllegalArgumentException("El producto preparado '" + producto.getNombre() + "' no tiene una receta registrada.");
                }

                for (Receta recetaItem : receta) {
                    Producto insumoProducto = recetaItem.getInsumo();
                    
                    if (insumoProducto == null || insumoProducto.getInventario() == null) {
                        throw new EntityNotFoundException("El insumo asignado a la receta no tiene inventario configurado.");
                    }

                    Inventario insumoInventario = insumoProducto.getInventario();
                    BigDecimal cantidadReqInsumo = recetaItem.getCantidad(); // BigDecimal de Receta
                    BigDecimal cantidadRequeridaTotal = cantidadReqInsumo.multiply(cantidadItem);

                    if (insumoInventario.getStockActual().compareTo(cantidadRequeridaTotal) < 0) {
                        throw new IllegalArgumentException("Stock insuficiente en insumo: " + insumoProducto.getNombre());
                    }

                    insumoInventario.setStockActual(insumoInventario.getStockActual().subtract(cantidadRequeridaTotal));
                    inventarioRepository.save(insumoInventario);
                }
            }

            // 2. Construir detalle
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

        // 3. Acumular saldo deudor si aplica
        if (estado == EstadoPago.PENDIENTE && cliente != null) {
            BigDecimal saldoPrevio = cliente.getSaldoDeudor() != null ? cliente.getSaldoDeudor() : BigDecimal.ZERO;
            cliente.setSaldoDeudor(saldoPrevio.add(totalVenta));
            clienteRepository.save(cliente);
        }

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