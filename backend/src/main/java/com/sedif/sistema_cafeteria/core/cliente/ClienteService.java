package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;

    @Transactional
    public ClienteResponseRecord registrarCliente(ClienteRequestRecord request) {
        Cliente cliente = Cliente.builder()
                .nombre(request.nombre())
                .email(request.email())
                .telefono(request.telefono())
                .telegramChatId(request.telegramChatId())
                .preferenciaNotificacion(request.preferenciaNotificacion())
                .build();

        return new ClienteResponseRecord(clienteRepository.save(cliente));
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