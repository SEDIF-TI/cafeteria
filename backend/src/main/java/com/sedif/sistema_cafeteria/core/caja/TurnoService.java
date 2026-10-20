package com.sedif.sistema_cafeteria.core.caja;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Caja por turnos. Un turno acumula los ingresos en efectivo (ventas y abonos);
 * al cerrarlo se compara el efectivo contado contra lo esperado (fondo + ingresos)
 * para obtener la diferencia (faltante o sobrante) del arqueo.
 */
@Service
@RequiredArgsConstructor
public class TurnoService {

    private final TurnoRepository turnoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public TurnoResponse abrirTurno(String nombreUsuario, BigDecimal fondoCaja) {
        if (turnoRepository.findByEstaActivoTrue().isPresent()) {
            throw new IllegalStateException("Ya existe un turno abierto actualmente. Ciérralo antes de abrir uno nuevo.");
        }

        Usuario cajero = usuarioRepository.findByUsername(nombreUsuario)
                .orElseThrow(() -> new EntityNotFoundException("Cajero no encontrado: " + nombreUsuario));

        Turno nuevoTurno = Turno.builder()
                .cajero(cajero)
                .fechaHoraApertura(LocalDateTime.now())
                .fondoInicial(fondoCaja)
                .totalIngresos(BigDecimal.ZERO)
                .estaActivo(true)
                .build();

        return new TurnoResponse(turnoRepository.save(nuevoTurno));
    }

    @Transactional
    public TurnoResponse cerrarTurno(BigDecimal totalContado) {
        Turno turno = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay ningún turno abierto para cerrar."));

        BigDecimal esperado = nz(turno.getFondoInicial()).add(nz(turno.getTotalIngresos()));

        turno.setFechaHoraCierre(LocalDateTime.now());
        turno.setTotalFisicoCierre(totalContado);
        turno.setDiferencia(totalContado.subtract(esperado)); // negativo = faltante, positivo = sobrante
        turno.setEstaActivo(false);

        return new TurnoResponse(turnoRepository.save(turno));
    }

    @Transactional(readOnly = true)
    public Optional<TurnoResponse> obtenerTurnoActivo() {
        return turnoRepository.findByEstaActivoTrue().map(TurnoResponse::new);
    }

    @Transactional(readOnly = true)
    public List<TurnoResponse> historialCortes() {
        return turnoRepository.findByEstaActivoFalseOrderByFechaHoraCierreDesc()
                .stream().map(TurnoResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public List<MovimientoCaja> movimientosDelTurno(Long turnoId) {
        return movimientoCajaRepository.findByTurnoIdOrderByFechaHoraDesc(turnoId);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
