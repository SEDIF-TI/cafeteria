package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.Valid;

import java.util.List;

/**
 * Devolucion de un prestamo. Si items es nulo o vacio se devuelve todo lo pendiente;
 * en otro caso solo la cantidad indicada por utensilio (devolucion parcial).
 */
public record DevolucionUtensilioRequestRecord(
        List<@Valid ItemUtensilioRequestRecord> items,
        String observaciones
) {}
