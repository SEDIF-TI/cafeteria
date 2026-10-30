package com.sedif.sistema_cafeteria.core.usuarios;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarTodos() {
        return usuarioRepository.findAll().stream()
                .map(u -> mapearADTO(u, null))
                .collect(Collectors.toList());
    }

    @Transactional
    public UsuarioResponse crear(UsuarioRequest request) {
        if (usuarioRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("El nombre de usuario ya está registrado");
        }

        // Generar contraseña automática de 8 caracteres
        String passwordPlana = UUID.randomUUID().toString().substring(0, 8);

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre());
        usuario.setUsername(request.username());
        // Se guarda encriptada como temporal para forzar el cambio en el primer ingreso.
        usuario.setPasswordTemporal(passwordEncoder.encode(passwordPlana));
        // s_password es obligatoria: mientras haya temporal, el login usa la temporal; aqui va
        // una aleatoria que nadie conoce hasta que el usuario defina la suya.
        usuario.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        usuario.setRol(request.rol());
        usuario.setActivo(true);

        Usuario guardado = usuarioRepository.save(usuario);

        // Retornamos la contraseña plana únicamente en la creación
        return mapearADTO(guardado, passwordPlana);
    }

    /**
     * Restablecimiento por administrador (Opción B): para el personal del sistema
     * que no tiene correo. Genera una contraseña temporal, la deja encriptada y
     * la devuelve en claro UNA sola vez para que el admin se la entregue en mano.
     * En su siguiente ingreso el usuario quedará obligado a cambiarla.
     */
    @Transactional
    public UsuarioResponse restablecerPassword(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        String passwordPlana = UUID.randomUUID().toString().substring(0, 8);
        usuario.setPasswordTemporal(passwordEncoder.encode(passwordPlana));
        usuarioRepository.save(usuario);

        return mapearADTO(usuario, passwordPlana);
    }

    @Transactional
    public UsuarioResponse cambiarEstado(Long id, boolean activo) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        usuario.setActivo(activo);
        Usuario actualizado = usuarioRepository.save(usuario);
        return mapearADTO(actualizado, null);
    }

    private UsuarioResponse mapearADTO(Usuario usuario, String passwordTemporal) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getUsername(),
                usuario.getRol(),
                usuario.isActivo(),
                passwordTemporal
        );
    }

    @Transactional
    public UsuarioResponse actualizar(Long id, UsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        // Validar si el nuevo username ya pertenece a otro usuario registrado
        if (!usuario.getUsername().equals(request.username()) && 
            usuarioRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("El nombre de usuario ya está registrado");
        }

        usuario.setNombre(request.nombre());
        usuario.setUsername(request.username());
        usuario.setRol(request.rol());

        Usuario actualizado = usuarioRepository.save(usuario);
        return mapearADTO(actualizado, null);
    }
}