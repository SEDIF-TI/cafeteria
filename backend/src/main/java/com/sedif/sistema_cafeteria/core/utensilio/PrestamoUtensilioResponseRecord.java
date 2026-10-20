package com.sedif.sistema_cafeteria.core.utensilio;

import java.time.LocalDateTime;
import java.util.List;

public record PrestamoUtensilioResponseRecord(
        Long id,
        Long ventaId,
        Long clienteId,
        String codigoEmpleado,
        String nombreEmpleado,
        String area,
        LocalDateTime fechaSalida,
        LocalDateTime fechaDevolucion,
        EstadoPrestamo estado,
        String observaciones,
        String registradoPor,
        List<Detalle> detalles
) {
    public record Detalle(Long utensilioId, String utensilio, Integer cantidad, Integer cantidadDevuelta) {}

    public PrestamoUtensilioResponseRecord(PrestamoUtensilio p) {
        this(p.getId(),
                p.getVenta() != null ? p.getVenta().getPnId() : null,
                p.getCliente() != null ? p.getCliente().getPnId() : null,
                p.getCodigoEmpleado(),
                p.getNombreEmpleado(),
                p.getArea(),
                p.getFechaSalida(),
                p.getFechaDevolucion(),
                p.getEstado(),
                p.getObservaciones(),
                p.getAuditable() != null ? p.getAuditable().getCreadoPor() : null,
                p.getDetalles().stream()
                        .map(d -> new Detalle(d.getUtensilio().getId(), d.getUtensilio().getNombre(),
                                d.getCantidad(), d.getCantidadDevuelta()))
                        .toList());
    }
}
