package com.sedif.sistema_cafeteria.core.venta;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findByClienteIdOrderByAuditableFechaCreacionDesc(Long clienteId);
}