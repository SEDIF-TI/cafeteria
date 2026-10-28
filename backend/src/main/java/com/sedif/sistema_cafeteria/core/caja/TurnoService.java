package com.sedif.sistema_cafeteria.core.caja;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

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
    public TurnoResponse cerrarTurno(BigDecimal totalContado, String autorizadorUsuario,
                                     String autorizadorPassword, String motivo) {
        Turno turno = turnoRepository.findByEstaActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No hay ningún turno abierto para cerrar."));

        BigDecimal esperado = nz(turno.getFondoInicial()).add(nz(turno.getTotalIngresos()));
        BigDecimal diferencia = totalContado.subtract(esperado); // negativo = faltante, positivo = sobrante

        // Un FALTANTE (falta dinero) solo puede cerrarse con autorización de un administrador.
        if (diferencia.signum() < 0) {
            Usuario admin = validarAutorizacionAdmin(autorizadorUsuario, autorizadorPassword);
            turno.setAutorizadoPor(admin.getUsername());
            turno.setMotivoDiferencia(motivo != null && !motivo.isBlank() ? motivo.trim() : null);
        }

        turno.setFechaHoraCierre(LocalDateTime.now());
        turno.setTotalFisicoCierre(totalContado);
        turno.setDiferencia(diferencia);
        turno.setEstaActivo(false);

        return new TurnoResponse(turnoRepository.save(turno));
    }

    /**
     * Corrige el arqueo de un corte YA CERRADO (error al contar). Solo un administrador,
     * con su usuario/contraseña y un motivo. No cambia las fechas; recalcula la diferencia.
     */
    @Transactional
    public TurnoResponse corregirCorte(Long id, BigDecimal totalContado, String autorizadorUsuario,
                                       String autorizadorPassword, String motivo) {
        Turno turno = turnoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Corte no encontrado: " + id));
        if (Boolean.TRUE.equals(turno.getEstaActivo())) {
            throw new IllegalStateException("No se puede corregir un turno que sigue abierto; ciérralo primero.");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("Indica el motivo de la corrección.");
        }
        Usuario admin = validarAutorizacionAdmin(autorizadorUsuario, autorizadorPassword);

        BigDecimal esperado = nz(turno.getFondoInicial()).add(nz(turno.getTotalIngresos()));
        turno.setTotalFisicoCierre(totalContado);
        turno.setDiferencia(totalContado.subtract(esperado));
        turno.setCorregidoPor(admin.getUsername());
        turno.setMotivoCorreccion(motivo.trim());

        return new TurnoResponse(turnoRepository.save(turno));
    }

    /** Verifica que las credenciales correspondan a un administrador válido. */
    private Usuario validarAutorizacionAdmin(String usuario, String password) {
        if (usuario == null || usuario.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Se requiere el usuario y la contraseña de un administrador.");
        }
        Usuario admin = usuarioRepository.findByUsername(usuario.trim())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales de administrador inválidas."));
        boolean esAdmin = admin.getRol() != null && admin.getRol().name().toUpperCase().contains("ADMIN");
        boolean passOk = passwordEncoder.matches(password, admin.getPassword())
                || (admin.getPasswordTemporal() != null && passwordEncoder.matches(password, admin.getPasswordTemporal()));
        if (!esAdmin) {
            throw new IllegalArgumentException("El usuario indicado no es administrador.");
        }
        if (!passOk) {
            throw new IllegalArgumentException("Credenciales de administrador inválidas.");
        }
        return admin;
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
