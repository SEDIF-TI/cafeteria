package com.sedif.sistema_cafeteria.core.venta;

import com.sedif.sistema_cafeteria.core.caja.MovimientoCaja;
import com.sedif.sistema_cafeteria.core.caja.MovimientoCajaRepository;
import com.sedif.sistema_cafeteria.core.caja.Turno;
import com.sedif.sistema_cafeteria.core.caja.TurnoRepository;
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
import java.time.LocalDateTime;
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
    
    // Inyecciones nuevas para conectar con el módulo de caja
    private final TurnoRepository turnoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;

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

    // Método refactorizado: Ahora exige montoIngresado y procesa la caja, retornando el Record correcto
    @Transactional
    public VentaResponseRecord liquidarDeuda(Long ventaId, BigDecimal montoIngresado) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con id: " + ventaId));

        if (venta.getEstado() == EstadoVenta.PAGADA) {
            throw new IllegalStateException("Esta cuenta ya se encuentra liquidada.");
        }

        // 1. Reglas anti-saldos negativos
        if (montoIngresado.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto a cobrar debe ser mayor a cero.");
        }

        if (montoIngresado.compareTo(venta.getTotal()) > 0) {
            throw new IllegalArgumentException(
                String.format("Monto inválido. El cliente adeuda exactamente $%s, no puedes ingresar $%s.", 
                venta.getTotal(), montoIngresado)
            );
        }

        // 2. Cambiamos el estado a PAGADA[cite: 6]. 
        venta.setEstado(EstadoVenta.PAGADA);
        Venta ventaActualizada = ventaRepository.save(venta);

        // 3. Generar el Movimiento de Caja en el turno actual
        Turno turnoActivo = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException("Debes abrir un turno en caja antes de realizar cobros."));

        MovimientoCaja ingresoDeuda = MovimientoCaja.builder()
                .turno(turnoActivo)
                .fechaHora(LocalDateTime.now())
                .tipo("INGRESO_DEUDA")
                .monto(montoIngresado)
                .descripcion("Liquidación de deuda - Ticket #" + ventaActualizada.getId())
                .ventaOrigenId(ventaActualizada.getId())
                .build();
        
        movimientoCajaRepository.save(ingresoDeuda);
        turnoActivo.setTotalIngresos(turnoActivo.getTotalIngresos().add(montoIngresado));

        // 4. Enviar notificación de confirmación de pago por Telegram[cite: 6]
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

    @Transactional
    public List<VentaResponseRecord> liquidarDeudasMasivas(List<Long> ventasIds, BigDecimal montoIngresado) {
        List<Venta> tickets = ventaRepository.findAllById(ventasIds);

        if (tickets.isEmpty()) {
            throw new IllegalArgumentException("No se encontraron los tickets especificados.");
        }

        BigDecimal totalAdeudado = BigDecimal.ZERO;
        Usuario cliente = tickets.get(0).getCliente(); // Tomamos el cliente del primer ticket

        // 1. Validar estado y sumar el total real de los tickets
        for (Venta ticket : tickets) {
            if (ticket.getEstado() != EstadoVenta.PENDIENTE) {
                throw new IllegalStateException("El ticket #" + ticket.getId() + " ya se encuentra liquidado.");
            }
            totalAdeudado = totalAdeudado.add(ticket.getTotal());
        }

        // 2. Regla anti-saldos negativos (Cobro exacto)
        if (montoIngresado.compareTo(totalAdeudado) != 0) {
            throw new IllegalArgumentException(
                String.format("Monto inválido. Los tickets suman exactamente $%s, pero se intentó ingresar $%s.", 
                totalAdeudado, montoIngresado)
            );
        }

        // 3. Marcar todos como PAGADOS
        tickets.forEach(ticket -> ticket.setEstado(EstadoVenta.PAGADA));
        List<Venta> ventasActualizadas = ventaRepository.saveAll(tickets);

        // 4. Registrar un único ingreso en la caja del turno actual
        Turno turnoActivo = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException("Debes abrir un turno en caja antes de realizar cobros."));

        MovimientoCaja ingresoMasivo = MovimientoCaja.builder()
                .turno(turnoActivo)
                .fechaHora(LocalDateTime.now())
                .tipo("INGRESO_DEUDA_MASIVA")
                .monto(montoIngresado)
                .descripcion("Liquidación masiva de " + tickets.size() + " tickets del cliente: " + (cliente != null ? cliente.getNombre() : "N/A"))
                .build();
        
        movimientoCajaRepository.save(ingresoMasivo);
        turnoActivo.setTotalIngresos(turnoActivo.getTotalIngresos().add(montoIngresado));

        // 5. Enviar confirmación consolidada por Telegram
        if (cliente != null && cliente.getTelegramChatId() != null) {
            String mensajePago = String.format(
                    "✅ *Pago Masivo Recibido - Cafetería*\n\nHola *%s*.\nHemos registrado la liquidación de %d tickets por un total de *$%s*.\n\n¡Tu cuenta está al corriente, gracias!",
                    cliente.getNombre(),
                    tickets.size(),
                    montoIngresado
            );
            
            try {
                sedifTelegramBot.enviarMensaje(cliente.getTelegramChatId(), mensajePago);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el recibo masivo por Telegram: " + e.getMessage());
            }
        }

        return ventasActualizadas.stream().map(VentaResponseRecord::new).toList();
    }
}