package com.sedif.sistema_cafeteria.core.venta;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record VentaRequestRecord(
        @NotNull(message = "El ID del usuario que realiza la venta es obligatorio")
        Long usuarioId,

        @NotNull(message = "El estado de la venta es obligatorio")
        EstadoVenta estado,

        // Recibe el ID del cliente seleccionado en el autocompletado
        Long clienteId,

        @NotEmpty(message = "La venta debe contener al menos un producto")
        List<@Valid ItemVentaRequestRecord> items
) {
}