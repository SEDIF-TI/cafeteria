package com.sedif.sistema_cafeteria.core.cliente;

import java.math.BigDecimal;

/** Respuesta del login del cliente: token + datos basicos para el apartado. */
public record ClienteLoginResponse(
        String token,
        Long clienteId,
        String nombre,
        String area,
        BigDecimal saldoDeudor,
        boolean debeCambiarPassword
) {}
