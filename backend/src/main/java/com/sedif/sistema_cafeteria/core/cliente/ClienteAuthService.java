package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.core.notificaciones.EmailService;
import com.sedif.sistema_cafeteria.core.venta.EstadoVenta;
import com.sedif.sistema_cafeteria.core.venta.VentaRepository;
import com.sedif.sistema_cafeteria.security.JwtTokenProvider;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Autenticacion y gestion de contrasena del apartado del cliente: login con
 * token, cambio obligatorio en el primer acceso, recuperacion por codigo al
 * correo y reset manual por un administrador.
 */
@Service
@RequiredArgsConstructor
public class ClienteAuthService {

    private static final Logger log = LoggerFactory.getLogger(ClienteAuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int VIGENCIA_CODIGO_MIN = 10;
    private static final int MAX_INTENTOS_CODIGO = 5;
    private static final String CREDENCIALES_INVALIDAS = "Codigo de empleado o contrasena incorrectos.";
    private static final String MENSAJE_NEUTRO =
            "Si el codigo existe y tiene un correo registrado, enviamos un codigo de verificacion.";

    private final ClienteRepository clienteRepository;
    private final ClienteResetTokenRepository resetTokenRepository;
    private final VentaRepository ventaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;

    // ---------------------------------------------------------------- Login

    @Transactional
    public ClienteLoginResponse login(ClienteLoginRequest request) {
        Cliente cliente = clienteRepository
                .findFirstByNumeroControlEmpleado(request.numeroControlEmpleado().trim())
                .orElseThrow(() -> new IllegalArgumentException(CREDENCIALES_INVALIDAS));

        if (!Boolean.TRUE.equals(cliente.getActivo())) {
            throw new IllegalArgumentException("Tu cuenta esta inactiva. Acude con el administrador.");
        }

        // Clientes registrados antes de existir la contrasena: se autoaprovisiona
        // la temporal (codigo + CAFE) en el primer login para no dejarlos fuera.
        if (cliente.getPassword() == null) {
            String temporal = ClienteService.passwordTemporalEnClaro(cliente.getNumeroControlEmpleado());
            if (!request.password().equals(temporal)) {
                throw new IllegalArgumentException(CREDENCIALES_INVALIDAS);
            }
            cliente.setPassword(passwordEncoder.encode(temporal));
            cliente.setPasswordCambiada(false);
            clienteRepository.save(cliente);
        } else if (!passwordEncoder.matches(request.password(), cliente.getPassword())) {
            throw new IllegalArgumentException(CREDENCIALES_INVALIDAS);
        }

        return new ClienteLoginResponse(
                tokenProvider.generarTokenCliente(cliente),
                cliente.getPnId(),
                cliente.getNombre(),
                cliente.getArea(),
                cliente.getSaldoDeudor(),
                !Boolean.TRUE.equals(cliente.getPasswordCambiada()));
    }

    // ---------------------------------------------------------------- Cambio de contrasena

    @Transactional
    public void cambiarPassword(String numeroControl, CambiarPasswordRequest request) {
        Cliente cliente = buscarPorNumeroControl(numeroControl);
        if (cliente.getPassword() == null
                || !passwordEncoder.matches(request.passwordActual(), cliente.getPassword())) {
            throw new IllegalArgumentException("La contrasena actual no es correcta.");
        }
        if (passwordEncoder.matches(request.passwordNueva(), cliente.getPassword())) {
            throw new IllegalArgumentException("La nueva contrasena debe ser distinta a la actual.");
        }
        cliente.setPassword(passwordEncoder.encode(request.passwordNueva()));
        cliente.setPasswordCambiada(true);
        clienteRepository.save(cliente);
    }

    // ---------------------------------------------------------------- Recuperacion por correo

    @Transactional
    public void solicitarCodigo(RecuperarSolicitarRequest request) {
        // Respuesta neutra siempre: no se revela si el codigo existe o tiene correo.
        clienteRepository.findFirstByNumeroControlEmpleado(request.numeroControlEmpleado().trim())
                .filter(c -> Boolean.TRUE.equals(c.getActivo()))
                .filter(c -> c.getEmail() != null && !c.getEmail().isBlank())
                .ifPresent(this::emitirCodigo);
    }

    private void emitirCodigo(Cliente cliente) {
        // Un solo codigo vigente por cliente: se invalidan los anteriores.
        List<ClienteResetToken> previos = resetTokenRepository.findByClientePnIdAndUsadoFalse(cliente.getPnId());
        previos.forEach(t -> t.setUsado(true));
        resetTokenRepository.saveAll(previos);

        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
        resetTokenRepository.save(ClienteResetToken.builder()
                .cliente(cliente)
                .codigoHash(passwordEncoder.encode(codigo))
                .expiracion(LocalDateTime.now().plusMinutes(VIGENCIA_CODIGO_MIN))
                .intentos(0)
                .usado(false)
                .build());

        String asunto = "Codigo de recuperacion - SEDIF Cafeteria";
        String mensaje = "Hola " + cliente.getNombre() + ".\n\n"
                + "Tu codigo para restablecer la contrasena es: " + codigo + "\n"
                + "Vence en " + VIGENCIA_CODIGO_MIN + " minutos y solo puede usarse una vez.\n\n"
                + "Si no solicitaste este cambio, ignora este mensaje: tu contrasena sigue igual.";
        try {
            emailService.enviarCorreo(cliente.getEmail(), asunto, mensaje);
        } catch (Exception e) {
            log.warn("No se pudo enviar el codigo de recuperacion al cliente id={}", cliente.getPnId());
        }
    }

    @Transactional
    public void confirmarCodigo(RecuperarConfirmarRequest request) {
        Cliente cliente = clienteRepository
                .findFirstByNumeroControlEmpleado(request.numeroControlEmpleado().trim())
                .orElseThrow(() -> new IllegalArgumentException("Codigo invalido o expirado."));

        ClienteResetToken token = resetTokenRepository
                .findFirstByClientePnIdAndUsadoFalseOrderByIdDesc(cliente.getPnId())
                .filter(ClienteResetToken::estaVigente)
                .orElseThrow(() -> new IllegalArgumentException("Codigo invalido o expirado."));

        if (token.getIntentos() >= MAX_INTENTOS_CODIGO) {
            token.setUsado(true);
            resetTokenRepository.save(token);
            throw new IllegalArgumentException("Demasiados intentos. Solicita un codigo nuevo.");
        }

        if (!passwordEncoder.matches(request.codigo().trim(), token.getCodigoHash())) {
            token.setIntentos(token.getIntentos() + 1);
            resetTokenRepository.save(token);
            throw new IllegalArgumentException("Codigo invalido o expirado.");
        }

        token.setUsado(true);
        resetTokenRepository.save(token);
        cliente.setPassword(passwordEncoder.encode(request.passwordNueva()));
        cliente.setPasswordCambiada(true);
        clienteRepository.save(cliente);
    }

    // ---------------------------------------------------------------- Reset por administrador

    /** Devuelve la contrasena a la temporal (codigo + CAFE) y obliga a cambiarla de nuevo. */
    @Transactional
    public void resetearPorAdmin(Long clienteId) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + clienteId));
        cliente.setPassword(passwordEncoder.encode(
                ClienteService.passwordTemporalEnClaro(cliente.getNumeroControlEmpleado())));
        cliente.setPasswordCambiada(false);
        clienteRepository.save(cliente);
    }

    // ---------------------------------------------------------------- Apartado (solo lectura)

    @Transactional(readOnly = true)
    public List<TicketDetalladoResponseRecord> misDeudas(String numeroControl) {
        Cliente cliente = buscarPorNumeroControl(numeroControl);
        return ventaRepository.findByClientePnIdAndEstadoOrderByPnIdDesc(cliente.getPnId(), EstadoVenta.PENDIENTE)
                .stream().map(TicketDetalladoResponseRecord::new).toList();
    }

    @Transactional(readOnly = true)
    public List<TicketDetalladoResponseRecord> miHistorial(String numeroControl) {
        Cliente cliente = buscarPorNumeroControl(numeroControl);
        return ventaRepository.findByClientePnIdOrderByPnIdDesc(cliente.getPnId())
                .stream().map(TicketDetalladoResponseRecord::new).toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponseRecord miCuenta(String numeroControl) {
        return new ClienteResponseRecord(buscarPorNumeroControl(numeroControl));
    }

    private Cliente buscarPorNumeroControl(String numeroControl) {
        return clienteRepository.findFirstByNumeroControlEmpleado(numeroControl)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado."));
    }
}
