package com.sedif.sistema_cafeteria.security.auth;

import com.sedif.sistema_cafeteria.core.telegram.SedifTelegramBot;
import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import com.sedif.sistema_cafeteria.core.usuarios.VistaDTO;
import com.sedif.sistema_cafeteria.exception.MessageConstants;
import com.sedif.sistema_cafeteria.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final SedifTelegramBot sedifTelegramBot; // Dependencia del bot inyectada

    @Transactional 
    public JwtResponse iniciarSesion(LoginRequest request) {

        Usuario usuario = usuarioRepository
                .buscarUsuario(request.identificador())
                .orElseThrow(() -> new IllegalArgumentException(MessageConstants.CREDENCIALES_INVALIDAS));

        // 1. Verificamos si el usuario tiene una recuperación activa
        boolean enRecuperacion = usuario.getPasswordTemporal() != null;
        boolean credencialesValidas;
        boolean requiereCambio = false;

        if (enRecuperacion) {
            // Si hay clave temporal, la principal queda bloqueada. SOLO aceptamos la temporal.
            credencialesValidas = passwordEncoder.matches(request.password(), usuario.getPasswordTemporal());
            requiereCambio = true;
        } else {
            // Flujo normal: solo evaluamos la contraseña principal
            credencialesValidas = passwordEncoder.matches(request.password(), usuario.getPassword());
        }

        // 2. Si falló la validación correspondiente, rechazamos el acceso
        if (!credencialesValidas) {
            throw new IllegalArgumentException(MessageConstants.CREDENCIALES_INVALIDAS);
        }

        // 3. Validar que la cuenta siga activa
        if (!Boolean.TRUE.equals(usuario.isActivo())) {
            throw new IllegalArgumentException(MessageConstants.USUARIO_INACTIVO);
        }

        // 4. Si entró exitosamente usando la temporal, la destruimos para que sea de un solo uso
        if (enRecuperacion) {
            usuario.setPasswordTemporal(null);
            usuarioRepository.save(usuario);
        }

        String token = tokenProvider.generarToken(usuario);
        List<VistaDTO> vistasPermitidas = obtenerVistasPermitidas(usuario);

        return new JwtResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getRol() != null ? usuario.getRol().name() : null,
                token,
                "Autenticación exitosa.",
                vistasPermitidas,
                null,           // <-- Esto cubre tu areaId
                requiereCambio  // <-- Esta es la alerta para el frontend
        );
    }

    @Transactional 
    public void recuperarPassword(String identificador) {
        Usuario usuario = usuarioRepository.buscarUsuario(identificador)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (usuario.getTelegramChatId() == null) {
            throw new IllegalStateException("El usuario no tiene una cuenta de Telegram vinculada. Contacte al administrador.");
        }

        String passwordPlana = UUID.randomUUID().toString().substring(0, 8);

        usuario.setPasswordTemporal(passwordEncoder.encode(passwordPlana));
        usuarioRepository.save(usuario);

        String mensaje = "Hola *" + usuario.getNombre() + "*.\n\n" +
                         "Se ha solicitado un restablecimiento de acceso para tu cuenta.\n" +
                         "Tu contraseña temporal es: *" + passwordPlana + "*\n\n" +
                         "Por favor, inicia sesión con esta clave y actualízala en el sistema.";

        try {
            sedifTelegramBot.enviarMensaje(usuario.getTelegramChatId(), mensaje);
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar el mensaje de Telegram. Intente más tarde.", e);
        }
    }

    public List<VistaDTO> obtenerVistasPermitidas(Usuario usuario) {
        return List.of(); 
    }

    @Transactional
    public void actualizarPasswordDefinitiva(String identificador, String nuevaPassword) {
        Usuario usuario = usuarioRepository.buscarUsuario(identificador)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
    }
}