package com.sedif.sistema_cafeteria.core.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    // Método estándar de Spring Data JPA
    Optional<Usuario> findByUsername(String username);
    
    // Lo agrego por si en tu AuthService o JwtAuthFilter lo tenías nombrado así
    Optional<Usuario> buscarUsuario(String username); 
}