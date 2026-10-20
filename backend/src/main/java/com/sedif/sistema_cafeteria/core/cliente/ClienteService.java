package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteService {

    /** Sufijo con el que se arma la contrasena temporal: codigo de empleado + CAFE. */
    public static final String SUFIJO_PASSWORD_TEMPORAL = "CAFE";

    private final ClienteRepository clienteRepository;
    private final PasswordEncoder passwordEncoder;

    /** Contrasena temporal en claro para un codigo de empleado dado. */
    public static String passwordTemporalEnClaro(String numeroControlEmpleado) {
        return numeroControlEmpleado.trim() + SUFIJO_PASSWORD_TEMPORAL;
    }

    @Transactional
    public ClienteResponseRecord registrarCliente(ClienteRequestRecord request) {
        // Los campos vacios se guardan como null: s_email es UNIQUE y varios
        // registros con "" provocaban un error de restriccion en el segundo registro.
        String email = limpiar(request.email());
        String telefono = limpiar(request.telefono());
        String preferencia = limpiar(request.preferenciaNotificacion());

        String numeroControl = request.numeroControlEmpleado().trim();
        if (clienteRepository.existsByNumeroControlEmpleadoIgnoreCase(numeroControl)) {
            throw new IllegalArgumentException("Ya existe un registro con el codigo de empleado: " + numeroControl);
        }
        if (email != null && clienteRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Ya existe un cliente registrado con el correo: " + email);
        }

        Cliente cliente = Cliente.builder()
                .nombre(request.nombre().trim())
                .email(email)
                .emailLegacy(email)
                .telefono(telefono)
                .telefonoLegacy(telefono)
                .numeroControlEmpleado(numeroControl)
                .area(request.area().trim())
                .preferenciaNotificacion(preferencia != null ? preferencia : (email != null ? "EMAIL" : "NINGUNO"))
                .password(passwordEncoder.encode(passwordTemporalEnClaro(numeroControl)))
                .passwordCambiada(false)
                .activo(true)
                .build();

        Cliente guardado = clienteRepository.save(cliente);
        return new ClienteResponseRecord(guardado);
    }

    private static String limpiar(String valor) {
        return (valor == null || valor.isBlank()) ? null : valor.trim();
    }

    @Transactional(readOnly = true)
    public List<ClienteResponseRecord> obtenerTodos() {
        return clienteRepository.findAll().stream()
                .map(ClienteResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponseRecord obtenerPorId(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + id));
        return new ClienteResponseRecord(cliente);
    }
}