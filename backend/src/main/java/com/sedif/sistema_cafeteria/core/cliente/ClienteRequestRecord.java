package com.sedif.sistema_cafeteria.core.cliente;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ClienteRequestRecord(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no debe exceder 100 caracteres")
        String nombre,
        @Email(message = "El correo no tiene un formato valido")
        @Size(max = 100, message = "El correo no debe exceder 100 caracteres")
        String email,
        @Size(max = 20, message = "El telefono no debe exceder 20 caracteres")
        String telefono,
        @NotBlank(message = "El codigo de empleado es obligatorio")
        @Size(max = 50, message = "El codigo de empleado no debe exceder 50 caracteres")
        @JsonAlias({"numeroControl", "codigoEmpleado", "numero_control_empleado"})
        String numeroControlEmpleado,
        @NotBlank(message = "El area es obligatoria")
        @Size(max = 150, message = "El area no debe exceder 150 caracteres")
        String area,
        @Pattern(regexp = "^(EMAIL|WHATSAPP|SMS|NINGUNO)?$", message = "Preferencia de notificacion no valida")
        String preferenciaNotificacion
) {}