package com.sedif.sistema_cafeteria.core.cliente;

import java.math.BigDecimal;

public record ClienteResponseRecord(
        Long id,
        String numeroControlEmpleado,
        String nombre,
        String email,
        String telefono,
        PreferenciaNotificacion preferenciaNotificacion,
        BigDecimal saldoDeudor,
        String passwordGenerada
) {
    public ClienteResponseRecord(Cliente cliente, String passwordGenerada) {
        this(
                cliente.getId(),
                cliente.getNumeroControlEmpleado(),
                cliente.getNombre(),
                cliente.getEmail(),
                cliente.getTelefono(),
                cliente.getPreferenciaNotificacion(),
                cliente.getSaldoDeudor(),
                passwordGenerada
        );
    }
}