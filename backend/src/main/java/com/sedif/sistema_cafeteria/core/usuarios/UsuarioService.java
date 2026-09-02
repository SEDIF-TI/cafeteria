package com.sedif.sistema_cafeteria.core.usuarios;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
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
        // TODO: Si usas Spring Security, recuerda usar passwordEncoder.encode(passwordPlana)
        usuario.setPassword(passwordPlana);
        usuario.setRol(request.rol());
        usuario.setActivo(true);

        Usuario guardado = usuarioRepository.save(usuario);
        
        // Retornamos la contraseña plana únicamente en la creación
        return mapearADTO(guardado, passwordPlana);
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
}