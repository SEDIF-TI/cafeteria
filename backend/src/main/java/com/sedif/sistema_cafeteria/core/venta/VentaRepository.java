package com.sedif.sistema_cafeteria.core.venta;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {
    // Busca los tickets de un cliente que coincidan con un estado específico (PENDIENTE)
    List<Venta> findByClienteIdAndEstado(Long clienteId, EstadoVenta estado);
}