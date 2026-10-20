package com.sedif.sistema_cafeteria.core.venta;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {
    
    List<Venta> findByClientePnIdAndEstado(Long clienteId, EstadoVenta estado);

    List<Venta> findByClientePnIdOrderByPnIdDesc(Long clienteId);

    List<Venta> findByClientePnIdAndEstadoOrderByPnIdDesc(Long clienteId, EstadoVenta estado);

    /** Ventas desde una fecha con sus detalles, producto y categoria (una sola consulta para el dashboard). */
    @org.springframework.data.jpa.repository.Query("""
            select distinct v from Venta v
            left join fetch v.detalles d
            left join fetch d.producto p
            left join fetch p.categoria
            left join fetch v.cliente
            left join fetch v.usuario
            where v.auditable.fechaCreacion >= :desde
            """)
    List<Venta> findDesdeConDetalles(@org.springframework.data.repository.query.Param("desde") java.time.LocalDateTime desde);

    List<Venta> findByEstado(EstadoVenta estado);
}