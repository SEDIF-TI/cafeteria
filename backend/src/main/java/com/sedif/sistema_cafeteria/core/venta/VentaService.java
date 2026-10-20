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
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository;
import com.sedif.sistema_cafeteria.core.recetas.Receta;
import com.sedif.sistema_cafeteria.core.recetas.RecetaRepository;
import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import com.sedif.sistema_cafeteria.core.utensilio.UtensilioService;
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
    private final RecetaRepository recetaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TurnoRepository turnoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    
    private final ClienteRepository clienteRepository; 
    private final EmailService emailService;
    private final UtensilioService utensilioService;

    @Transactional
    public VentaResponseRecord registrarVenta(VentaRequestRecord request) {
        
        Usuario usuario = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Usuario (Cajero) no encontrado con id: " + request.usuarioId()));

        Cliente cliente = null;
        if (request.clienteId() != null) {
            cliente = clienteRepository.findById(request.clienteId())
                    .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + request.clienteId()));
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("La venta debe contener al menos un producto.");
        }

        // Las ventas en efectivo entran a la caja: exigen un turno abierto.
        // Los demas metodos (tarjeta, transferencia, credito) no mueven efectivo.
        boolean esEfectivo = "EFECTIVO".equalsIgnoreCase(request.metodoPago());
        Turno turnoActivo = null;
        if (esEfectivo) {
            turnoActivo = turnoRepository.findByEstaActivoTrue()
                    .orElseThrow(() -> new IllegalStateException(
                            "Debes abrir un turno en caja antes de cobrar en efectivo."));
        }

        // 1. Crear e insertar la venta con total inicial en cero
        Venta venta = Venta.builder()
                .usuario(usuario)
                .cliente(cliente)
                .estado(request.estado())
                .metodoPago(request.metodoPago())
                .total(BigDecimal.ZERO)
                .detalles(new ArrayList<>())
                .build();

        Venta ventaGuardada = ventaRepository.saveAndFlush(venta);

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVentaRequestRecord itemReq : request.items()) {
            Producto producto = productoRepository.findById(itemReq.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + itemReq.productoId()));

            BigDecimal cantidadItem = BigDecimal.valueOf(itemReq.cantidad());
            BigDecimal subtotal = producto.getPrecio().multiply(cantidadItem);
            totalVenta = totalVenta.add(subtotal);

            // Descuento de stock
            if (Boolean.TRUE.equals(producto.getEsDirecto())) {
                Inventario inventario = producto.getInventario();
                if (inventario == null) {
                    throw new IllegalArgumentException("El producto directo '" + producto.getNombre() + "' no cuenta con registro de inventario.");
                }
                if (inventario.getStockActual() == null || inventario.getStockActual().compareTo(cantidadItem) < 0) {
                    throw new IllegalArgumentException("Stock insuficiente para el producto directo: " + producto.getNombre());
                }
                inventario.setStockActual(inventario.getStockActual().subtract(cantidadItem));
                inventarioRepository.save(inventario);
            } else {
                List<Receta> receta = recetaRepository.findByProductoPadreId(producto.getId());

                // Un producto compuesto sin receta se venderia sin descontar insumos:
                // se bloquea para no vaciar el inventario de forma invisible.
                if (receta.isEmpty()) {
                    throw new IllegalArgumentException(
                            "El producto '" + producto.getNombre() + "' no tiene receta configurada; "
                            + "no se puede descontar inventario. Configura su receta antes de venderlo.");
                }

                for (Receta recetaItem : receta) {
                    Inventario insumo = null;
                    if (recetaItem.getInsumo() != null) {
                        insumo = recetaItem.getInsumo().getInventario();
                    }

                    if (insumo == null) {
                        throw new IllegalArgumentException("Insumo de inventario no configurado para el producto: " + producto.getNombre());
                    }

                    BigDecimal cantidadReqInsumo = recetaItem.getCantidad() != null ? recetaItem.getCantidad() : BigDecimal.ZERO;
                    BigDecimal cantidadRequeridaTotal = cantidadReqInsumo.multiply(cantidadItem);

                    if (insumo.getStockActual() == null || insumo.getStockActual().compareTo(cantidadRequeridaTotal) < 0) {
                        throw new IllegalArgumentException("Stock insuficiente en el insumo: " + insumo.getNombre());
                    }

                    insumo.setStockActual(insumo.getStockActual().subtract(cantidadRequeridaTotal));
                    inventarioRepository.save(insumo);
                }
            }

            // 2. Construir e insertar detalle de venta
            DetalleVenta detalle = DetalleVenta.builder()
                    .venta(ventaGuardada)
                    .producto(producto)
                    .cantidad(itemReq.cantidad())
                    .precioUnitario(producto.getPrecio())
                    .subtotal(subtotal)
                    .build();

            ventaGuardada.getDetalles().add(detalle);
        }

        // 3. Actualizar total definitivo de la venta
        ventaGuardada.setTotal(totalVenta);
        ventaRepository.save(ventaGuardada);

        // 3b. Registrar el ingreso en la caja cuando el cobro fue en efectivo.
        if (turnoActivo != null) {
            movimientoCajaRepository.save(MovimientoCaja.builder()
                    .turno(turnoActivo)
                    .fechaHora(LocalDateTime.now())
                    .tipo("INGRESO_VENTA")
                    .monto(totalVenta)
                    .descripcion("Venta en efectivo - Ticket #" + ventaGuardada.getPnId())
                    .ventaOrigenId(ventaGuardada.getPnId())
                    .build());
            turnoActivo.setTotalIngresos(
                    (turnoActivo.getTotalIngresos() != null ? turnoActivo.getTotalIngresos() : BigDecimal.ZERO)
                            .add(totalVenta));
        }

        // 4. Salida de cubiertos: solo si el cajero activo el switch. Si no, se quedan en la cafeteria.
        if (Boolean.TRUE.equals(request.llevaCubiertos())) {
            if (request.cubiertos() == null) {
                throw new IllegalArgumentException("Indica el codigo de empleado, el area y los cubiertos que se lleva.");
            }
            utensilioService.registrarPrestamo(request.cubiertos(), ventaGuardada, cliente);
        }

        // Notificación por correo
        if (ventaGuardada.getCliente() != null && ventaGuardada.getCliente().getEmail() != null && !ventaGuardada.getCliente().getEmail().trim().isEmpty()) {
            String tipoTicket = ventaGuardada.getEstado() == EstadoVenta.PAGADO ? "Recibo de Compra" : "Cargo Pendiente (Deuda)";
            String asunto = tipoTicket + " - Cafetería";
            String mensajeTicket = String.format(
                    "Hola %s.\nEl total de tu orden es: $%s.\n\n¡Gracias por tu preferencia!",
                    ventaGuardada.getCliente().getNombre(),
                    ventaGuardada.getTotal()
            );
            
            try {
                emailService.enviarCorreo(ventaGuardada.getCliente().getEmail(), asunto, mensajeTicket);
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
        return ventaRepository.findByClientePnIdAndEstado(clienteId, EstadoVenta.PENDIENTE)
                .stream()
                .map(VentaResponseRecord::new)
                .toList();
    }

    @Transactional
    public VentaResponseRecord liquidarDeuda(Long ventaId, BigDecimal montoIngresado) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con id: " + ventaId));

        if (venta.getEstado() == EstadoVenta.PAGADO) {
            throw new IllegalStateException("Esta cuenta ya se encuentra liquidada.");
        }

        if (montoIngresado == null || montoIngresado.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto a cobrar debe ser mayor a cero.");
        }

        BigDecimal saldo = venta.getSaldoPendiente();
        if (montoIngresado.compareTo(saldo) > 0) {
            throw new IllegalArgumentException(
                String.format("Monto inválido. El ticket adeuda $%s, no puedes abonar $%s.",
                saldo, montoIngresado)
            );
        }

        // Se acumula el abono; si cubre el saldo el ticket queda PAGADO
        BigDecimal abonadoPrevio = venta.getMontoAbonado() != null ? venta.getMontoAbonado() : BigDecimal.ZERO;
        venta.setMontoAbonado(abonadoPrevio.add(montoIngresado));
        if (venta.getSaldoPendiente().compareTo(BigDecimal.ZERO) == 0) {
            venta.setEstado(EstadoVenta.PAGADO);
        }
        
        Venta ventaActualizada = ventaRepository.save(venta);

        Turno turnoActivo = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException("Debes abrir un turno en caja antes de realizar cobros."));

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

        if (ventaActualizada.getCliente() != null && ventaActualizada.getCliente().getEmail() != null && !ventaActualizada.getCliente().getEmail().trim().isEmpty()) {
            String asunto = "Pago Recibido - Cafetería";
            String mensajePago = String.format(
                    "Hola %s.\nHemos registrado la liquidación por $%s para tu ticket #%s.\n\n¡Tu cuenta está al corriente, gracias!",
                    ventaActualizada.getCliente().getNombre(),
                    montoIngresado,
                    ventaActualizada.getPnId()
            );
            
            try {
                emailService.enviarCorreo(ventaActualizada.getCliente().getEmail(), asunto, mensajePago);
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
                throw new IllegalStateException("El ticket #" + ticket.getPnId() + " ya se encuentra liquidado.");
            }
            totalAdeudado = totalAdeudado.add(ticket.getSaldoPendiente());
        }

        if (montoIngresado.compareTo(totalAdeudado) != 0) {
            throw new IllegalArgumentException(
                String.format("Monto inválido. Los tickets suman exactamente $%s, pero se intentó ingresar $%s.", 
                totalAdeudado, montoIngresado)
            );
        }

        tickets.forEach(ticket -> {
            ticket.setMontoAbonado(ticket.getTotal());
            ticket.setEstado(EstadoVenta.PAGADO);
        });
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

        if (cliente != null && cliente.getEmail() != null && !cliente.getEmail().trim().isEmpty()) {
            String asunto = "Pago Masivo Recibido - Cafetería";
            String mensajePago = String.format(
                    "Hola %s.\nHemos registrado la liquidación de %d tickets por un total de $%s.\n\n¡Tu cuenta está al corriente, gracias!",
                    cliente.getNombre(),
                    tickets.size(),
                    montoIngresado
            );
            
            try {
                emailService.enviarCorreo(cliente.getEmail(), asunto, mensajePago);
            } catch (Exception e) {
                System.err.println("No se pudo enviar el recibo masivo por correo: " + e.getMessage());
            }
        }

        return ventasActualizadas.stream().map(VentaResponseRecord::new).toList();
    }
}