package com.sedif.sistema_cafeteria.core.utensilio;

import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Catalogo de utensilios (cucharas, tenedores, platos...) con su stock fisico. */
@Entity
@Table(name = "utensilio")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Utensilio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(nullable = false)
    private Integer stockTotal;

    /** Piezas que se encuentran fisicamente en la cafeteria. */
    @Column(nullable = false)
    private Integer stockDisponible;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable();
}
