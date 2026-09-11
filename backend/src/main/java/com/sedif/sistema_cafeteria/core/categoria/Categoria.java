package com.sedif.sistema_cafeteria.core.categoria;

import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "categoria")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder // Agregado para permitir Categoria.builder()
@NoArgsConstructor // Requerido por JPA
@AllArgsConstructor // Requerido por el @Builder
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    @Embedded
    @Builder.Default // Opcional, pero recomendado para inicializarlo al usar el Builder
    private Auditable auditable = new Auditable();
}