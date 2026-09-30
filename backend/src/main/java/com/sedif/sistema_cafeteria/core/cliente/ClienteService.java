package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.core.venta.VentaRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final VentaRepository ventaRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ClienteResponseRecord registrarCliente(ClienteRequestRecord request) {
        if (clienteRepository.existsByNumeroControlEmpleado(request.numeroControlEmpleado())) {
            throw new IllegalArgumentException("El número de control/empleado ya se encuentra registrado.");
        }

        String passwordPorDefecto = request.numeroControlEmpleado().trim() + "CAF";

        Cliente cliente = Cliente.builder()
                .numeroControlEmpleado(request.numeroControlEmpleado().trim())
                .nombre(request.nombre())
                .email(request.email())
                .telefono(request.telefono())
                .preferenciaNotificacion(request.preferenciaNotificacion())
                .password(passwordEncoder.encode(passwordPorDefecto))
                .build();

        Cliente guardado = clienteRepository.save(cliente);
        return new ClienteResponseRecord(guardado, passwordPorDefecto);
    }

    @Transactional(readOnly = true)
    public ClienteResponseRecord loginCliente(ClienteLoginRequest request) {
        Cliente cliente = clienteRepository.findByNumeroControlEmpleado(request.numeroControlEmpleado())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales inválidas."));

        if (!passwordEncoder.matches(request.password(), cliente.getPassword())) {
            throw new IllegalArgumentException("Credenciales inválidas.");
        }

        return new ClienteResponseRecord(cliente, null);
    }

    @Transactional
    public String restablecerPassword(ClienteResetPasswordRequest request) {
        Cliente cliente = clienteRepository.findByNumeroControlEmpleado(request.numeroControlEmpleado())
                .orElseThrow(() -> new IllegalArgumentException("Los datos no coinciden con ningún cliente registrado."));

        boolean emailValido = request.email() != null && request.email().equalsIgnoreCase(cliente.getEmail());
        boolean telefonoValido = request.telefono() != null && request.telefono().equals(cliente.getTelefono());

        if (!emailValido || !telefonoValido) {
            throw new IllegalArgumentException("El correo o el teléfono no coinciden con nuestros registros.");
        }

        String nuevaPassword = cliente.getNumeroControlEmpleado() + "CAF";
        cliente.setPassword(passwordEncoder.encode(nuevaPassword));
        clienteRepository.save(cliente);

        return nuevaPassword;
    }

    @Transactional(readOnly = true)
    public List<TicketClienteResponseRecord> obtenerTicketsCliente(Long clienteId) {
        return ventaRepository.findByClienteIdOrderByAuditableFechaCreacionDesc(clienteId)
                .stream()
                .map(TicketClienteResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClienteResponseRecord> obtenerTodosLosClientes() {
        return clienteRepository.findAll()
                .stream()
                // Usamos el constructor que acepta (Cliente, passwordGenerada) mandando null a la contraseña
                .map(cliente -> new ClienteResponseRecord(cliente, null)) 
                .toList();
    }

    @Transactional
    public ClienteResponseRecord registrarAbono(Long clienteId, java.math.BigDecimal montoAbono) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con ID: " + clienteId));
                
        // Restar el abono al saldo deudor actual
        java.math.BigDecimal nuevoSaldo = cliente.getSaldoDeudor().subtract(montoAbono);
        
        // Evitar saldos negativos si abonan de más
        if (nuevoSaldo.compareTo(java.math.BigDecimal.ZERO) < 0) {
            nuevoSaldo = java.math.BigDecimal.ZERO;
        }
        
        cliente.setSaldoDeudor(nuevoSaldo);
        clienteRepository.save(cliente);
        
        return new ClienteResponseRecord(cliente, null);
    }
}