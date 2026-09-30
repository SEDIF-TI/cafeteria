package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.core.venta.EstadoPago;
import com.sedif.sistema_cafeteria.core.venta.Venta;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TicketClienteResponseRecord(
        Long id,
        BigDecimal total,
        EstadoPago estadoPago,
        LocalDateTime fecha
) {
    public TicketClienteResponseRecord(Venta venta) {
        this(
                venta.getId(),
                venta.getTotal(),
                venta.getEstadoPago(),
                // Ajusta este getter al nombre exacto en tu clase Auditable (getDFechaCreacion o getFechaCreacion)
                venta.getAuditable().getFechaCreacion() 
        );
    }
}