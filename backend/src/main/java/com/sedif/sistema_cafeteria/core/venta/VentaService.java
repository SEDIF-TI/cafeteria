package com.sedif.sistema_cafeteria.core.venta;

import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.producto.Producto;
import com.sedif.sistema_cafeteria.core.producto.ProductoInsumo;
import com.sedif.sistema_cafeteria.core.producto.ProductoInsumoRepository;
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository;
import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import com.sedif.sistema_cafeteria.core.telegram.SedifTelegramBot;
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
    private final SedifTelegramBot sedifTelegramBot;

    @Transactional
    public VentaResponseRecord registrarVenta(VentaRequestRecord request) {
        
        // 1. Buscar cajero
        Usuario usuario = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Usuario (Cajero) no encontrado con id: " + request.usuarioId()));

        // 2. Buscar cliente (solo si la petición lo incluye)
        Usuario cliente = null;
        if (request.clienteId() != null) {
            cliente = usuarioRepository.findById(request.clienteId())
                    .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + request.clienteId()));
        }

        // 3. Inicializar la venta mapeando el estado y el cliente
        Venta venta = Venta.builder()
                .usuario(usuario)
                .cliente(cliente)
                .estado(request.estado())
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

            // 4. Lógica de Descuento de Inventario
            if (Boolean.TRUE.equals(producto.getEsDirecto())) {
                Inventario inventario = producto.getInventario();
                
                if (inventario.getStockActual().compareTo(cantidadItem) < 0) {
                    throw new IllegalArgumentException("Stock insuficiente para el producto directo: " + producto.getNombre());
                }
                
                inventario.setStockActual(inventario.getStockActual().subtract(cantidadItem));
                inventarioRepository.save(inventario);
            } else {
                // Producto compuesto (consume insumos por receta)
                List<ProductoInsumo> receta = productoInsumoRepository.findByProductoId(producto.getId());
                for (ProductoInsumo recetaItem : receta) {
                    Inventario insumo = recetaItem.getInsumo();
                    
                    BigDecimal cantidadReqInsumo = BigDecimal.valueOf(recetaItem.getCantidadRequerida());
                    BigDecimal cantidadRequeridaTotal = cantidadReqInsumo.multiply(cantidadItem);

                    if (insumo.getStockActual().compareTo(cantidadRequeridaTotal) < 0) {
                        throw new IllegalArgumentException("Stock insuficiente en insumo de receta: " + insumo.getNombre());
                    }
                    
                    insumo.setStockActual(insumo.getStockActual().subtract(cantidadRequeridaTotal));
                    inventarioRepository.save(insumo);
                }
            }

            // 5. Construir el detalle de venta
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

        // 6. Envío de ticket por Telegram si el cliente está vinculado
        if (ventaGuardada.getCliente() != null && ventaGuardada.getCliente().getTelegramChatId() != null) {
            String tipoTicket = ventaGuardada.getEstado() == EstadoVenta.PAGADA ? "Recibo de Compra" : "Cargo Pendiente (Deuda)";
            String mensajeTicket = String.format(
                    "☕ *%s - Cafetería*\n\nHola *%s*.\nEl total de tu orden es: *$%s*.\n\n¡Gracias por tu preferencia!",
                    tipoTicket,
                    ventaGuardada.getCliente().getNombre(),
                    ventaGuardada.getTotal()
            );
            
            try {
                sedifTelegramBot.enviarMensaje(ventaGuardada.getCliente().getTelegramChatId(), mensajeTicket);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el ticket por Telegram: " + e.getMessage());
            }
        }

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

    @Transactional(readOnly = true)
    public List<VentaResponseRecord> obtenerDeudasPorCliente(Long clienteId) {
        return ventaRepository.findByClienteIdAndEstado(clienteId, EstadoVenta.PENDIENTE)
                .stream()
                .map(VentaResponseRecord::new)
                .toList();
    }

    @Transactional
    public VentaResponseRecord liquidarDeuda(Long ventaId) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con id: " + ventaId));

        if (venta.getEstado() == EstadoVenta.PAGADA) {
            throw new IllegalStateException("Esta cuenta ya se encuentra liquidada.");
        }

        // 1. Cambiamos el estado a PAGADA. 
        // (Nota: Aquí conectaremos el registro de "Movimiento de Caja" cuando creemos la tabla de Turnos).
        venta.setEstado(EstadoVenta.PAGADA);
        Venta ventaActualizada = ventaRepository.save(venta);

        // 2. Enviar notificación de confirmación de pago por Telegram
        if (ventaActualizada.getCliente() != null && ventaActualizada.getCliente().getTelegramChatId() != null) {
            String mensajePago = String.format(
                    "✅ *Pago Recibido - Cafetería*\n\nHola *%s*.\nHemos registrado la liquidación de tu ticket por *$%s*.\n\n¡Tu cuenta está al corriente, gracias!",
                    ventaActualizada.getCliente().getNombre(),
                    ventaActualizada.getTotal()
            );
            
            try {
                sedifTelegramBot.enviarMensaje(ventaActualizada.getCliente().getTelegramChatId(), mensajePago);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el recibo de liquidación por Telegram: " + e.getMessage());
            }
        }

        return new VentaResponseRecord(ventaActualizada);
    }
}