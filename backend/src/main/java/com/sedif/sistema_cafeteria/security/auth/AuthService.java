package com.sedif.sistema_cafeteria.security.auth;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import com.sedif.sistema_cafeteria.core.usuarios.VistaDTO;
import com.sedif.sistema_cafeteria.exception.MessageConstants;
import com.sedif.sistema_cafeteria.security.JwtTokenProvider;
import com.sedif.sistema_cafeteria.core.notificaciones.EmailService; // Importación actualizada
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
    private final EmailService emailService; // Dependencia de correo inyectada

    @Transactional 
    public JwtResponse iniciarSesion(LoginRequest request) {

        Usuario usuario = usuarioRepository
                .buscarUsuario(request.identificador())
                .orElseThrow(() -> new IllegalArgumentException(MessageConstants.CREDENCIALES_INVALIDAS));

        boolean enRecuperacion = usuario.getPasswordTemporal() != null;
        boolean credencialesValidas;
        boolean requiereCambio = false;

        if (enRecuperacion) {
            credencialesValidas = passwordEncoder.matches(request.password(), usuario.getPasswordTemporal());
            requiereCambio = true;
        } else {
            credencialesValidas = passwordEncoder.matches(request.password(), usuario.getPassword());
        }

        if (!credencialesValidas) {
            throw new IllegalArgumentException(MessageConstants.CREDENCIALES_INVALIDAS);
        }

        if (!Boolean.TRUE.equals(usuario.isActivo())) {
            throw new IllegalArgumentException(MessageConstants.USUARIO_INACTIVO);
        }

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
                null,           
                requiereCambio  
        );
    }

    @Transactional 
    public void recuperarPassword(String identificador) {
        Usuario usuario = usuarioRepository.buscarUsuario(identificador)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        // Validamos el correo del cajero/admin en lugar del chat de Telegram
        if (usuario.getEmail() == null || usuario.getEmail().isEmpty()) {
            throw new IllegalStateException("El usuario no tiene un correo electrónico registrado. Contacte al administrador.");
        }

        String passwordPlana = UUID.randomUUID().toString().substring(0, 8);

        usuario.setPasswordTemporal(passwordEncoder.encode(passwordPlana));
        usuarioRepository.save(usuario);

        // Mensaje limpio sin los asteriscos de Markdown de Telegram
        String asunto = "Recuperación de Contraseña - Cafetería";
        String mensaje = "Hola " + usuario.getNombre() + ".\n\n" +
                         "Se ha solicitado un restablecimiento de acceso para tu cuenta.\n" +
                         "Tu contraseña temporal es: " + passwordPlana + "\n\n" +
                         "Por favor, inicia sesión con esta clave y actualízala inmediatamente en el sistema.";

        try {
            emailService.enviarCorreo(usuario.getEmail(), asunto, mensaje);
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar el correo de recuperación. Intente más tarde.", e);
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