package com.sedif.sistema_cafeteria.core.utensilio;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prestamo_utensilio_detalle")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrestamoUtensilioDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prestamo_id", nullable = false)
    private PrestamoUtensilio prestamo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utensilio_id", nullable = false)
    private Utensilio utensilio;

    @Column(nullable = false)
    private Integer cantidad;

    @Builder.Default
    @Column(nullable = false)
    private Integer cantidadDevuelta = 0;

    public int pendiente() {
        return cantidad - (cantidadDevuelta == null ? 0 : cantidadDevuelta);
    }
}
