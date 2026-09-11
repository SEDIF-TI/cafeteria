package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.producto.Producto; // Asumiendo tu entidad de menú/producto
import jakarta.persistence.*;
import lombok.*;
import com.sedif.sistema_cafeteria.core.inventario.Inventario; // Asumiendo tu entidad de inventario

@Entity
@Table(name = "producto_insumo")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoInsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto; // El café americano, pastel, etc.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventario_id", nullable = false)
    private Inventario insumo; // Café en grano, leche, etc.

    @Column(nullable = false)
    private Double cantidadRequerida; // Ej: 18.0 (gramos) o 250.0 (mililitros)
}