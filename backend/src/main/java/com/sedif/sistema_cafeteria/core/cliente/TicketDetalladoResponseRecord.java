package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.core.venta.EstadoVenta;
import com.sedif.sistema_cafeteria.core.venta.Venta;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Ticket del historial del cliente, con su saldo y el detalle de productos. */
public record TicketDetalladoResponseRecord(
        Long id,
        BigDecimal total,
        BigDecimal saldoPendiente,
        EstadoVenta estado,
        String metodoPago,
        LocalDateTime fecha,
        List<Linea> detalles
) {
    public record Linea(String producto, Integer cantidad, BigDecimal subtotal) {}

    public TicketDetalladoResponseRecord(Venta venta) {
        this(
                venta.getPnId(),
                venta.getTotal(),
                venta.getSaldoPendiente(),
                venta.getEstado(),
                venta.getMetodoPago(),
                venta.getAuditable() != null ? venta.getAuditable().getFechaCreacion() : null,
                venta.getDetalles() == null ? List.of() : venta.getDetalles().stream()
                        .map(d -> new Linea(
                                d.getProducto() != null ? d.getProducto().getNombre() : "Producto",
                                d.getCantidad(),
                                d.getSubtotal()))
                        .toList()
        );
    }
}
