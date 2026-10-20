package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ItemUtensilioRequestRecord(
        @NotNull(message = "El utensilio es obligatorio")
        Long utensilioId,
        @NotNull(message = "La cantidad es obligatoria")
        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        Integer cantidad
) {}
