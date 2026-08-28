package com.sedif.sistema_cafeteria.core.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Método estándar o consulta personalizada corregida sin 'email'
    @Query("SELECT u FROM Usuario u WHERE u.username = :identificador")
    Optional<Usuario> buscarUsuario(@Param("identificador") String identificador);

    // O alternativamente, si prefieres el método automático de Spring Data:
    // Optional<Usuario> findByUsername(String username);
}