package com.sedif.sistema_cafeteria.core.producto;

import com.sedif.sistema_cafeteria.core.categoria.Categoria;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.math.BigDecimal;

@Entity
@Table(name = "producto")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    // NUEVO CAMPO: Costo de adquisición o fabricación
    @Column(precision = 10, scale = 2)
    private BigDecimal costo;

    // Se conserva por compatibilidad; la fuente de verdad ahora es tipoProducto
    // (esDirecto == (tipoProducto == DIRECTO)). Lo mantiene en sync el servicio.
    @Column(nullable = false)
    private Boolean esDirecto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_producto", length = 20)
    private TipoProducto tipoProducto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventario_id", nullable = true)
    private Inventario inventario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable();
}