package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Datos de salida de cubiertos. La venta lo envia solo cuando el switch esta activo. */
public record PrestamoUtensilioRequestRecord(
        @NotBlank(message = "El codigo de empleado es obligatorio")
        @Size(max = 50, message = "El codigo de empleado no debe exceder 50 caracteres")
        String codigoEmpleado,
        // Si viene vacia se usa el area registrada del empleado
        @Size(max = 150, message = "El area no debe exceder 150 caracteres")
        String area,
        @Size(max = 500, message = "Las observaciones no deben exceder 500 caracteres")
        String observaciones,
        @NotEmpty(message = "Debe indicar al menos un utensilio")
        List<@Valid ItemUtensilioRequestRecord> utensilios
) {}
