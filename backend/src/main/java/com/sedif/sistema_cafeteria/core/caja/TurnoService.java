package com.sedif.sistema_cafeteria.core.caja;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TurnoService {

    private final TurnoRepository turnoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public Turno abrirTurno(String nombreUsuario, BigDecimal fondoCaja) {
        
        if (turnoRepository.findByEstaActivoTrue().isPresent()) {
            throw new IllegalStateException("Ya existe un turno abierto actualmente. Ciérralo antes de abrir uno nuevo.");
        }

        // Buscar al usuario por el dato real del token (ajusta el método según tu repositorio, ej. findByEmail)
        Usuario cajero = usuarioRepository.findByUsername(nombreUsuario)
                .orElseThrow(() -> new EntityNotFoundException("Cajero no encontrado: " + nombreUsuario));

        Turno nuevoTurno = Turno.builder()
                .cajero(cajero)
                .fechaHoraApertura(LocalDateTime.now())
                .fondoInicial(fondoCaja)
                .totalIngresos(BigDecimal.ZERO)
                .estaActivo(true)
                .build();

        return turnoRepository.save(nuevoTurno);
    }
}