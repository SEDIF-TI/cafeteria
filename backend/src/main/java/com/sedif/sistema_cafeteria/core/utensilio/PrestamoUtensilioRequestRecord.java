package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Datos de salida de cubiertos. La venta lo envia solo cuando el switch esta activo.
 *
 * Normalmente el frontend NO manda la lista de utensilios: solo las banderas del
 * kit estandar ({@code incluyeCharola}, {@code juegos}) y el backend arma el kit.
 * El codigo de empleado es opcional para soportar "publico general".
 */
public record PrestamoUtensilioRequestRecord(
        // Opcional: en publico general puede venir vacio
        @Size(max = 50, message = "El codigo de empleado no debe exceder 50 caracteres")
        String codigoEmpleado,
        // Nombre/referencia a mano (publico general). Opcional.
        @Size(max = 150, message = "El nombre no debe exceder 150 caracteres")
        String nombre,
        // Si viene vacia se usa el area del empleado; si tampoco hay, queda "Sin area"
        @Size(max = 150, message = "El area no debe exceder 150 caracteres")
        String area,
        @Size(max = 500, message = "Las observaciones no deben exceder 500 caracteres")
        String observaciones,
        // Kit estandar: cuantos juegos y si incluye charola
        @Min(value = 1, message = "Los juegos deben ser al menos 1")
        Integer juegos,
        Boolean incluyeCharola,
        // Opcional: si se envia una lista explicita, se usa en lugar del kit estandar
        List<@Valid ItemUtensilioRequestRecord> utensilios
) {}
