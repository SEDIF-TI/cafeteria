package com.sedif.sistema_cafeteria.core.inventario;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, Long> {
    List<Inventario> findByActivoTrue();
    Optional<Inventario> findByNombre(String nombre);
}