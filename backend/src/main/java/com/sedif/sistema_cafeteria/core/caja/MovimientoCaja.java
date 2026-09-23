package com.sedif.sistema_cafeteria.core.caja;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class MovimientoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turno_id", nullable = false)
    private Turno turno;

    @Column(name = "d_fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "s_tipo", nullable = false, length = 50)
    private String tipo; 

    @Column(name = "n_monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "s_descripcion")
    private String descripcion;
    
    @Column(name = "n_venta_origen_id")
    private Long ventaOrigenId; 

}