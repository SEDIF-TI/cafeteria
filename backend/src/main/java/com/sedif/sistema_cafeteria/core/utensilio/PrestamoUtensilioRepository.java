package com.sedif.sistema_cafeteria.core.utensilio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PrestamoUtensilioRepository extends JpaRepository<PrestamoUtensilio, Long> {
    List<PrestamoUtensilio> findAllByOrderByFechaSalidaDesc();
    List<PrestamoUtensilio> findByEstadoInOrderByFechaSalidaDesc(Collection<EstadoPrestamo> estados);
    List<PrestamoUtensilio> findByCodigoEmpleadoOrderByFechaSalidaDesc(String codigoEmpleado);
}
