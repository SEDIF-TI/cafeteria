package com.sedif.sistema_cafeteria.core.venta;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import com.sedif.sistema_cafeteria.core.utensilio.PrestamoUtensilioRequestRecord;
import java.util.List;

public record VentaRequestRecord(
        @NotNull(message = "El ID del usuario/cajero es obligatorio")
        Long usuarioId,

        @NotNull(message = "El estado de la venta es obligatorio")
        EstadoVenta estado,

        // Agregamos el método de pago faltante
        @NotNull(message = "El método de pago es obligatorio")
        String metodoPago, // O usa tu Enum: MetodoPago metodoPago

        // Recibe el ID del cliente seleccionado en el autocompletado (Nulo si es público general)
        Long clienteId,

        @NotEmpty(message = "La venta debe contener al menos un producto")
        List<@Valid ItemVentaRequestRecord> items,

        // Switch "se lleva cubiertos": si es false o nulo no se registra ninguna salida de utensilios
        Boolean llevaCubiertos,

        // Datos de la salida (codigo de empleado, area y utensilios). Obligatorio solo si llevaCubiertos = true
        @Valid PrestamoUtensilioRequestRecord cubiertos
) {}