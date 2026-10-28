package com.sedif.sistema_cafeteria.core.utensilio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UtensilioRepository extends JpaRepository<Utensilio, Long> {
    List<Utensilio> findAllByOrderByNombreAsc();
    List<Utensilio> findByActivoTrueOrderByNombreAsc();
    boolean existsByNombreIgnoreCase(String nombre);
    Optional<Utensilio> findByNombreIgnoreCase(String nombre);
}
