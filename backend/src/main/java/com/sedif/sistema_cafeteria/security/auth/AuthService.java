package com.sedif.sistema_cafeteria.security.auth;

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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public JwtResponse iniciarSesion(LoginRequest request) {

        Usuario usuario = usuarioRepository
                .buscarUsuario(request.identificador())
                .orElseThrow(() -> new IllegalArgumentException(MessageConstants.CREDENCIALES_INVALIDAS));

        if (!passwordEncoder.matches(request.password(), usuario.getPassword())) {
            throw new IllegalArgumentException(MessageConstants.CREDENCIALES_INVALIDAS);
        }

        if (!Boolean.TRUE.equals(usuario.isActivo())) {
            throw new IllegalArgumentException(MessageConstants.USUARIO_INACTIVO);
        }

        String token = tokenProvider.generarToken(usuario);
        List<VistaDTO> vistasPermitidas = obtenerVistasPermitidas(usuario);

        return new JwtResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getRol() != null ? usuario.getRol().name() : null,
                token,
                "Autenticacion exitosa.",
                vistasPermitidas,
                null
        );
    }

    public List<VistaDTO> obtenerVistasPermitidas(Usuario usuario) {
        return List.of(); 
    }
}