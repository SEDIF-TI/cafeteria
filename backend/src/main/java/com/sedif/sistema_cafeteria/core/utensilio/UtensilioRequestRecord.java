package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UtensilioRequestRecord(
        @NotBlank(message = "El nombre del utensilio es obligatorio")
        @Size(max = 100, message = "El nombre no debe exceder 100 caracteres")
        String nombre,
        @NotNull(message = "El stock total es obligatorio")
        @Min(value = 0, message = "El stock total no puede ser negativo")
        Integer stockTotal
) {}
