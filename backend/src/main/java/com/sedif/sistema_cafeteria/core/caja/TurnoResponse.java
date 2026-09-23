package com.sedif.sistema_cafeteria.core.caja;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TurnoResponse(
        Long id,
        Long cajeroId,
        String nombreCajero,
        LocalDateTime fechaHoraApertura,
        BigDecimal fondoInicial,
        BigDecimal totalIngresos,
        Boolean estaActivo
) {
    public TurnoResponse(Turno turno) {
        this(
                turno.getId(),
                turno.getCajero().getId(),
                turno.getCajero().getNombre(), // Asumiendo que tu entidad Usuario tiene getNombre()
                turno.getFechaHoraApertura(),
                turno.getFondoInicial(),
                turno.getTotalIngresos(),
                turno.getEstaActivo()
        );
    }
}