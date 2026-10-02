package com.sedif.sistema_cafeteria.core.cliente;

import java.math.BigDecimal;

public record ClienteResponseRecord(
        Long id,
        String nombre,
        String email,
        String telefono,
        boolean activo
) {
    public ClienteResponseRecord(Cliente cliente) {
        this(
                cliente.getPnId(),
                cliente.getNombre(),
                cliente.getCorreoElectronico(),
                cliente.getTelefono(),
                cliente.getActivo() != null ? cliente.getActivo() : true
        );
    }
}