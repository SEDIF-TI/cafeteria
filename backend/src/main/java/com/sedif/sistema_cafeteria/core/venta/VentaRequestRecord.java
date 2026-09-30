package com.sedif.sistema_cafeteria.core.venta;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record VentaRequestRecord(
        @NotNull(message = "El usuario/cajero es obligatorio")
        Long usuarioId,

        Long clienteId, // Opcional (null si es venta general de contado sin cliente asignado)

        EstadoPago estadoPago, // PAGADO o PENDIENTE (Si es null, por defecto será PAGADO)

        @NotEmpty(message = "La venta debe contener al menos un producto")
        List<ItemVentaRequestRecord> items
) {}