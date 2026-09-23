package com.sedif.sistema_cafeteria.core.venta;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record VentaRequestRecord(
        @NotNull(message = "El ID del usuario que realiza la venta es obligatorio")
        Long usuarioId,

        Long clienteId, // Nulo si es público general, presente si proviene de cliente QR/Deudor

        @NotEmpty(message = "La venta debe contener al menos un producto")
        List<@Valid ItemVentaRequestRecord> items
) {}