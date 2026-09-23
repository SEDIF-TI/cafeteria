package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClienteRequestRecord(
        @NotBlank(message = "El nombre es obligatorio")
        String nombre,

        String email,

        String telefono,

        String telegramChatId,

        @NotNull(message = "Debe definir una preferencia de notificación")
        PreferenciaNotificacion preferenciaNotificacion
) {}