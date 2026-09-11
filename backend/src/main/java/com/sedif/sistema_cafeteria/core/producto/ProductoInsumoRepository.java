package com.sedif.sistema_cafeteria.core.producto;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductoInsumoRepository extends JpaRepository<ProductoInsumo, Long> {
    List<ProductoInsumo> findByProductoId(Long productoId);
}