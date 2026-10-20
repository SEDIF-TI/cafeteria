package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.core.venta.EstadoVenta;
import com.sedif.sistema_cafeteria.core.venta.Venta;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TicketClienteResponseRecord(
        Long id,
        BigDecimal total,
        EstadoVenta estadoPago, // Usamos EstadoVenta que es el que tiene tu entidad Venta
        LocalDateTime fecha
) {
    public TicketClienteResponseRecord(Venta venta) {
        this(
                venta.getPnId(),     // Se usa pnId en lugar de getId()
                venta.getTotal(),
                venta.getEstado(),   // Se usa getEstado() en lugar de getEstadoPago()
                venta.getAuditable() != null ? venta.getAuditable().getFechaCreacion() : null
        );
    }
}