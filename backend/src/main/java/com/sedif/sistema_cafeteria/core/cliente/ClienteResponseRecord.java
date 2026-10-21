package com.sedif.sistema_cafeteria.core.cliente;

import java.math.BigDecimal;

public record ClienteResponseRecord(
        Long id,
        String nombre,
        String numeroControl,
        String area,
        String preferenciaNotificacion,
        BigDecimal saldoDeudor,
        boolean activo
) {
    // El correo y el telefono (datos personales) NO se exponen en el JSON.
    // El backend los sigue usando internamente (p. ej. para enviar el ticket por correo),
    // pero no viajan en ninguna respuesta de la API.
    public ClienteResponseRecord(Cliente cliente) {
        this(
                cliente.getPnId(),
                cliente.getNombre(),
                cliente.getNumeroControlEmpleado(),
                cliente.getArea(),
                cliente.getPreferenciaNotificacion(),
                cliente.getSaldoDeudor(),
                Boolean.TRUE.equals(cliente.getActivo())
        );
    }
}
