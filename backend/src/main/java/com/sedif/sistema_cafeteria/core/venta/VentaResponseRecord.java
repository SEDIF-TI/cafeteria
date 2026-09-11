package com.sedif.sistema_cafeteria.core.venta;

import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

public record VentaResponseRecord(
        Long id,
        Long usuarioId,
        String usuarioNombre,
        BigDecimal total,
        LocalDateTime fechaCreacion,
        List<DetalleVentaResponseRecord> detalles
) {
    public record DetalleVentaResponseRecord(
            Long productoId,
            String productoNombre,
            Integer cantidad,
            BigDecimal precioUnitario,
            BigDecimal subtotal
    ) {
        public DetalleVentaResponseRecord(DetalleVenta detalle) {
            this(
                detalle.getProducto().getId(),
                detalle.getProducto().getNombre(),
                detalle.getCantidad(),
                detalle.getPrecioUnitario(),
                detalle.getSubtotal()
            );
        }
    }

    public VentaResponseRecord(Venta venta) {
        this(
            venta.getId(),
            venta.getUsuario().getId(),
            venta.getUsuario().getNombre(), // Ajusta según el campo de nombre en tu entidad Usuario
            venta.getTotal(),
            venta.getAuditable().getFechaCreacion(),
            venta.getDetalles().stream().map(DetalleVentaResponseRecord::new).toList()
        );
    }
}