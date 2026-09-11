package com.sedif.sistema_cafeteria.core.inventario;

import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "inventario")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UnidadMedida unidadMedida; // UNIDAD, GRAMOS, MILILITROS

    @Column(nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal stockActual;

    @Column(nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal stockMinimo; // Para alertas de stock bajo

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable();
}