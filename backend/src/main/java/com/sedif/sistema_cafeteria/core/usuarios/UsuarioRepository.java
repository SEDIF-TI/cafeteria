package com.sedif.sistema_cafeteria.core.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    boolean existsByUsername(String username);
    Optional<Usuario> findByUsername(String username);

    default Optional<Usuario> buscarUsuario(String username) {
        return findByUsername(username);
    }
}