package com.sedif.sistema_cafeteria.core.recetas;

import com.sedif.sistema_cafeteria.core.producto.Producto; // Ajustar según ubicación real de Producto
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "recetas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Receta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_padre_id", nullable = false)
    private Producto productoPadre;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "insumo_id", nullable = false)
    private Producto insumo;

    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal cantidad;
}