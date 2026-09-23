package com.sedif.sistema_cafeteria.core.cliente;

import java.math.BigDecimal;

public record ClienteResponseRecord(
        Long id,
        String nombre,
        String email,
        String telefono,
        String telegramChatId,
        PreferenciaNotificacion preferenciaNotificacion,
        BigDecimal saldoDeudor
) {
    public ClienteResponseRecord(Cliente cliente) {
        this(
                cliente.getId(),
                cliente.getNombre(),
                cliente.getEmail(),
                cliente.getTelefono(),
                cliente.getTelegramChatId(),
                cliente.getPreferenciaNotificacion(),
                cliente.getSaldoDeudor()
        );
    }
}