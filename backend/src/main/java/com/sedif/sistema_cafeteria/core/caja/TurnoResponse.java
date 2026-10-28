package com.sedif.sistema_cafeteria.core.caja;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TurnoResponse(
        Long id,
        Long cajeroId,
        String nombreCajero,
        LocalDateTime fechaHoraApertura,
        LocalDateTime fechaHoraCierre,
        BigDecimal fondoInicial,
        BigDecimal totalIngresos,
        BigDecimal totalEsperado,
        BigDecimal totalContado,
        BigDecimal diferencia,
        String autorizadoPor,
        String motivoDiferencia,
        String corregidoPor,
        String motivoCorreccion,
        Boolean estaActivo
) {
    public TurnoResponse(Turno turno) {
        this(
                turno.getId(),
                turno.getCajero() != null ? turno.getCajero().getId() : null,
                turno.getCajero() != null ? turno.getCajero().getNombre() : null,
                turno.getFechaHoraApertura(),
                turno.getFechaHoraCierre(),
                turno.getFondoInicial(),
                turno.getTotalIngresos(),
                // Esperado en caja = fondo inicial + ingresos del turno
                nz(turno.getFondoInicial()).add(nz(turno.getTotalIngresos())),
                turno.getTotalFisicoCierre(),
                turno.getDiferencia(),
                turno.getAutorizadoPor(),
                turno.getMotivoDiferencia(),
                turno.getCorregidoPor(),
                turno.getMotivoCorreccion(),
                turno.getEstaActivo()
        );
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
