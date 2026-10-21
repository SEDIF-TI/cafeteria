package com.sedif.sistema_cafeteria.core.venta;

import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

// Las respuestas de venta llevan solo IDs en las referencias (usuario, cliente, producto).
// El frontend traduce esos IDs a nombres usando los catalogos. Asi el JSON no expone
// nombres ni datos personales.
public record VentaResponseRecord(
        Long id,
        Long usuarioId,
        BigDecimal total,
        LocalDateTime fechaCreacion,
        List<DetalleVentaResponseRecord> detalles,
        EstadoVenta estado,
        Long clienteId,
        String metodoPago,
        BigDecimal montoAbonado,
        BigDecimal saldoPendiente
) {
    public record DetalleVentaResponseRecord(
            Long productoId,
            Integer cantidad,
            BigDecimal precioUnitario,
            BigDecimal subtotal
    ) {
        public DetalleVentaResponseRecord(DetalleVenta detalle) {
            this(
                detalle.getProducto().getId(),
                detalle.getCantidad(),
                detalle.getPrecioUnitario(),
                detalle.getSubtotal()
            );
        }
    }

    public VentaResponseRecord(Venta venta) {
        this(
            venta.getPnId(),
            venta.getUsuario().getId(),
            venta.getTotal(),
            venta.getAuditable().getFechaCreacion(),
            venta.getDetalles().stream().map(DetalleVentaResponseRecord::new).toList(),
            venta.getEstado(),
            venta.getCliente() != null ? venta.getCliente().getPnId() : null,
            venta.getMetodoPago(),
            venta.getMontoAbonado() != null ? venta.getMontoAbonado() : BigDecimal.ZERO,
            venta.getSaldoPendiente()
        );
    }
}