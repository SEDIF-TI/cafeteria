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

        // Toda venta se registra dentro de un turno de caja abierto, incluidas las de
        // credito: asi queda constancia del turno en que se genero la deuda. Solo el
        // efectivo suma al arqueo del dia; la deuda se cobra despues (por quincena) y
        // ese pago entrara al turno del dia en que se liquide.
        Turno turnoActivo = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException(
                        "Debes abrir un turno en caja antes de registrar una venta."));
        boolean esEfectivo = "EFECTIVO".equalsIgnoreCase(request.metodoPago());

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

        // 3b. Registrar el movimiento en el turno segun la forma de pago.
        boolean esCredito = ventaGuardada.getEstado() == EstadoVenta.PENDIENTE;
        String tipoMov = esEfectivo ? "INGRESO_VENTA" : (esCredito ? "VENTA_CREDITO" : "INGRESO_NO_EFECTIVO");
        String descMov = esEfectivo
                ? "Venta en efectivo - Ticket #" + ventaGuardada.getPnId()
                : esCredito
                    ? "Venta a credito (pendiente de pago) - Ticket #" + ventaGuardada.getPnId()
                    : "Venta " + ventaGuardada.getMetodoPago() + " - Ticket #" + ventaGuardada.getPnId();
        movimientoCajaRepository.save(MovimientoCaja.builder()
                .turno(turnoActivo)
                .fechaHora(LocalDateTime.now())
                .tipo(tipoMov)
                .monto(totalVenta)
                .descripcion(descMov)
                .ventaOrigenId(ventaGuardada.getPnId())
                .build());
        // Solo el efectivo suma al dinero esperado en caja (arqueo del dia).
        if (esEfectivo) {
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

        // Notificación por correo (ticket detallado con logo, productos y forma de pago)
        if (ventaGuardada.getCliente() != null && ventaGuardada.getCliente().getEmail() != null && !ventaGuardada.getCliente().getEmail().trim().isEmpty()) {
            String tipoTicket = ventaGuardada.getEstado() == EstadoVenta.PAGADO ? "Recibo de Compra" : "Cargo Pendiente (Deuda)";
            String asunto = tipoTicket + " - Cafetería SEDIF";
            try {
                emailService.enviarCorreoHtml(ventaGuardada.getCliente().getEmail(), asunto, construirTicketHtml(ventaGuardada));
            } catch (Exception e) {
                System.err.println("No se pudo enviar el ticket por correo: " + e.getMessage());
            }
        }

        return new VentaResponseRecord(ventaGuardada);
    }

    /** Arma el cuerpo HTML del ticket: logo, productos, forma de pago y total. */
    private String construirTicketHtml(Venta venta) {
        boolean pagado = venta.getEstado() == EstadoVenta.PAGADO;
        String tituloEstado = pagado ? "Recibo de compra" : "Cargo pendiente (deuda)";
        String colorEstado = pagado ? "#2e7d32" : "#b26a00";
        String metodo = venta.getMetodoPago() != null ? venta.getMetodoPago() : "N/D";

        StringBuilder filas = new StringBuilder();
        for (DetalleVenta d : venta.getDetalles()) {
            String nombre = d.getProducto() != null ? d.getProducto().getNombre() : "Producto";
            filas.append(String.format(
                    "<tr>"
                  + "<td style='padding:8px 10px;border-bottom:1px solid #eee;'>%s</td>"
                  + "<td style='padding:8px 10px;border-bottom:1px solid #eee;text-align:center;'>%d</td>"
                  + "<td style='padding:8px 10px;border-bottom:1px solid #eee;text-align:right;'>$%s</td>"
                  + "<td style='padding:8px 10px;border-bottom:1px solid #eee;text-align:right;'>$%s</td>"
                  + "</tr>",
                    nombre, d.getCantidad(), d.getPrecioUnitario(), d.getSubtotal()));
        }

        return ""
          + "<div style='font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;"
          + "border:1px solid #eee;border-radius:12px;overflow:hidden;'>"
          + "  <div style='background:#691c32;padding:20px;text-align:center;'>"
          + "    <img src='cid:" + "logoCafeteria" + "' alt='Cafetería SEDIF' style='max-height:70px;' />"
          + "    <div style='color:#fff;font-size:18px;font-weight:bold;margin-top:8px;'>Cafetería SEDIF</div>"
          + "  </div>"
          + "  <div style='padding:24px;'>"
          + "    <p style='margin:0 0 4px;'>Hola <strong>" + venta.getCliente().getNombre() + "</strong>,</p>"
          + "    <p style='margin:0 0 16px;color:#555;'>Gracias por tu compra. Aquí está el detalle de tu orden:</p>"
          + "    <p style='margin:0 0 16px;'>"
          + "      <span style='display:inline-block;padding:4px 12px;border-radius:14px;"
          + "background:" + colorEstado + ";color:#fff;font-size:13px;'>" + tituloEstado + "</span>"
          + "      &nbsp;·&nbsp; Ticket #" + venta.getPnId()
          + "    </p>"
          + "    <table style='width:100%;border-collapse:collapse;font-size:14px;'>"
          + "      <thead><tr style='background:#faf3f5;'>"
          + "        <th style='padding:8px 10px;text-align:left;'>Producto</th>"
          + "        <th style='padding:8px 10px;text-align:center;'>Cant.</th>"
          + "        <th style='padding:8px 10px;text-align:right;'>P. Unit.</th>"
          + "        <th style='padding:8px 10px;text-align:right;'>Subtotal</th>"
          + "      </tr></thead>"
          + "      <tbody>" + filas + "</tbody>"
          + "    </table>"
          + "    <div style='margin-top:16px;padding-top:12px;border-top:2px solid #691c32;"
          + "display:flex;justify-content:space-between;font-size:16px;'>"
          + "      <span><strong>Forma de pago:</strong> " + metodo + "</span>"
          + "      <span><strong>Total: $" + venta.getTotal() + "</strong></span>"
          + "    </div>"
          + (pagado ? "" : "    <p style='margin:16px 0 0;color:#b26a00;font-size:13px;'>"
                          + "Este cargo quedó registrado como deuda. Podrás liquidarlo en caja.</p>")
          + "    <p style='margin:20px 0 0;color:#888;font-size:12px;text-align:center;'>"
          + "¡Gracias por tu preferencia!</p>"
          + "  </div>"
          + "</div>";
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