package com.sedif.sistema_cafeteria.core.venta;

import com.sedif.sistema_cafeteria.core.caja.MovimientoCaja;
import com.sedif.sistema_cafeteria.core.caja.MovimientoCajaRepository;
import com.sedif.sistema_cafeteria.core.caja.Turno;
import com.sedif.sistema_cafeteria.core.caja.TurnoRepository;
import com.sedif.sistema_cafeteria.core.cliente.Cliente;
import com.sedif.sistema_cafeteria.core.cliente.ClienteRepository;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.notificaciones.EmailService;
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
    private final TurnoRepository turnoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    
    private final ClienteRepository clienteRepository; 
    private final EmailService emailService;

    @Transactional
    public VentaResponseRecord registrarVenta(VentaRequestRecord request) {
        
        Usuario usuario = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Usuario (Cajero) no encontrado con id: " + request.usuarioId()));

        Cliente cliente = null;
        if (request.clienteId() != null) {
            cliente = clienteRepository.findById(request.clienteId())
                    .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + request.clienteId()));
        }

        // 1. Crear e insertar primero la venta con total en cero para obtener el ID generado por la BD
        Venta venta = Venta.builder()
                .usuario(usuario)
                .cliente(cliente)
                .estado(request.estado())
                .total(BigDecimal.ZERO)
                .detalles(new ArrayList<>())
                .build();

        // FORZAR LA INSERCIÓN INMEDIATA en PostgreSQL usando saveAndFlush()
        Venta ventaGuardada = ventaRepository.saveAndFlush(venta);

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVentaRequestRecord itemReq : request.items()) {
            Producto producto = productoRepository.findById(itemReq.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + itemReq.productoId()));

            BigDecimal cantidadItem = BigDecimal.valueOf(itemReq.cantidad());
            BigDecimal subtotal = producto.getPrecio().multiply(cantidadItem);
            totalVenta = totalVenta.add(subtotal);

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

            // 2. Construir el detalle utilizando la venta ya guardada (con su ID oficial)
            DetalleVenta detalle = DetalleVenta.builder()
                    .venta(ventaGuardada)
                    .producto(producto)
                    .cantidad(itemReq.cantidad())
                    .precioUnitario(producto.getPrecio())
                    .subtotal(subtotal)
                    .build();

             // Agregar a la colección rastreada por Hibernate directamente
            ventaGuardada.getDetalles().add(detalle);
        }

        // 3. Asignar los detalles y actualizar el total definitivo
        ventaGuardada.setTotal(totalVenta);
        ventaRepository.save(ventaGuardada);

        if (ventaGuardada.getCliente() != null && ventaGuardada.getCliente().getCorreoElectronico() != null && !ventaGuardada.getCliente().getCorreoElectronico().isEmpty()) {
            String tipoTicket = ventaGuardada.getEstado() == EstadoVenta.PAGADA ? "Recibo de Compra" : "Cargo Pendiente (Deuda)";
            String asunto = tipoTicket + " - Cafetería";
            String mensajeTicket = String.format(
                    "Hola %s.\nEl total de tu orden es: $%s.\n\n¡Gracias por tu preferencia!",
                    ventaGuardada.getCliente().getNombre(),
                    ventaGuardada.getTotal()
            );
            
            try {
                emailService.enviarCorreo(ventaGuardada.getCliente().getCorreoElectronico(), asunto, mensajeTicket);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el ticket por correo: " + e.getMessage());
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
        // CORRECCIÓN APLICADA: findByClientePnIdAndEstado
        return ventaRepository.findByClientePnIdAndEstado(clienteId, EstadoVenta.PENDIENTE)
                .stream()
                .map(VentaResponseRecord::new)
                .toList();
    }

    @Transactional
    public VentaResponseRecord liquidarDeuda(Long ventaId, BigDecimal montoIngresado) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con id: " + ventaId));

        if (venta.getEstado() == EstadoVenta.PAGADA) {
            throw new IllegalStateException("Esta cuenta ya se encuentra liquidada.");
        }

        if (montoIngresado.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto a cobrar debe ser mayor a cero.");
        }

        if (montoIngresado.compareTo(venta.getTotal()) > 0) {
            throw new IllegalArgumentException(
                String.format("Monto inválido. El cliente adeuda exactamente $%s, no puedes ingresar $%s.", 
                venta.getTotal(), montoIngresado)
            );
        }

        venta.setEstado(EstadoVenta.PAGADA);
        Venta ventaActualizada = ventaRepository.save(venta);

        Turno turnoActivo = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException("Debes abrir un turno en caja antes de realizar cobros."));

        // CORRECCIÓN APLICADA: ventaActualizada.getPnId()
        MovimientoCaja ingresoDeuda = MovimientoCaja.builder()
                .turno(turnoActivo)
                .fechaHora(LocalDateTime.now())
                .tipo("INGRESO_DEUDA")
                .monto(montoIngresado)
                .descripcion("Liquidación de deuda - Ticket #" + ventaActualizada.getPnId())
                .ventaOrigenId(ventaActualizada.getPnId())
                .build();
        
        movimientoCajaRepository.save(ingresoDeuda);
        turnoActivo.setTotalIngresos(turnoActivo.getTotalIngresos().add(montoIngresado));

        if (ventaActualizada.getCliente() != null && ventaActualizada.getCliente().getCorreoElectronico() != null && !ventaActualizada.getCliente().getCorreoElectronico().isEmpty()) {
            String asunto = "Pago Recibido - Cafetería";
            String mensajePago = String.format(
                    "Hola %s.\nHemos registrado la liquidación de tu ticket por $%s.\n\n¡Tu cuenta está al corriente, gracias!",
                    ventaActualizada.getCliente().getNombre(),
                    ventaActualizada.getTotal()
            );
            
            try {
                emailService.enviarCorreo(ventaActualizada.getCliente().getCorreoElectronico(), asunto, mensajePago);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el recibo por correo: " + e.getMessage());
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
        Cliente cliente = tickets.get(0).getCliente(); 

        for (Venta ticket : tickets) {
            if (ticket.getEstado() != EstadoVenta.PENDIENTE) {
                // CORRECCIÓN APLICADA: ticket.getPnId()
                throw new IllegalStateException("El ticket #" + ticket.getPnId() + " ya se encuentra liquidado.");
            }
            totalAdeudado = totalAdeudado.add(ticket.getTotal());
        }

        if (montoIngresado.compareTo(totalAdeudado) != 0) {
            throw new IllegalArgumentException(
                String.format("Monto inválido. Los tickets suman exactamente $%s, pero se intentó ingresar $%s.", 
                totalAdeudado, montoIngresado)
            );
        }

        tickets.forEach(ticket -> ticket.setEstado(EstadoVenta.PAGADA));
        List<Venta> ventasActualizadas = ventaRepository.saveAll(tickets);

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

        if (cliente != null && cliente.getCorreoElectronico() != null && !cliente.getCorreoElectronico().isEmpty()) {
            String asunto = "Pago Masivo Recibido - Cafetería";
            String mensajePago = String.format(
                    "Hola %s.\nHemos registrado la liquidación de %d tickets por un total de $%s.\n\n¡Tu cuenta está al corriente, gracias!",
                    cliente.getNombre(),
                    tickets.size(),
                    montoIngresado
            );
            
            try {
                emailService.enviarCorreo(cliente.getCorreoElectronico(), asunto, mensajePago);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el recibo masivo por correo: " + e.getMessage());
            }
        }

        return ventasActualizadas.stream().map(VentaResponseRecord::new).toList();
    }
}