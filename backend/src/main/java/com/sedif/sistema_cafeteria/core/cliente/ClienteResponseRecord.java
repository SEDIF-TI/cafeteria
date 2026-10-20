package com.sedif.sistema_cafeteria.core.cliente;

import java.math.BigDecimal;

public record ClienteResponseRecord(
        Long id,
        String nombre,
        String email,
        String telefono,
        String numeroControl,
        String area,
        String preferenciaNotificacion,
        BigDecimal saldoDeudor,
        boolean activo
) {
    public ClienteResponseRecord(Cliente cliente) {
        this(
                cliente.getPnId(),
                cliente.getNombre(),
                cliente.getEmail(),
                cliente.getTelefono(),
                cliente.getNumeroControlEmpleado(),
                cliente.getArea(),
                cliente.getPreferenciaNotificacion(),
                cliente.getSaldoDeudor(),
                Boolean.TRUE.equals(cliente.getActivo())
        );
    }
}
