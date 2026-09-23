package com.sedif.sistema_cafeteria.core.caja;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TurnoRepository extends JpaRepository<Turno, Long> {
    
    // Devuelve el turno que esté actualmente abierto (solo debería haber uno)
    Optional<Turno> findByEstaActivoTrue();
}