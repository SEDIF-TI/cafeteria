package com.sedif.sistema_cafeteria.core.cliente;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    boolean existsByEmailIgnoreCase(String email);

    java.util.Optional<Cliente> findFirstByNumeroControlEmpleado(String numeroControlEmpleado);

    boolean existsByNumeroControlEmpleadoIgnoreCase(String numeroControlEmpleado);
}