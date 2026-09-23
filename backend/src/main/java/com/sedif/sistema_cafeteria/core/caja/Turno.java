package com.sedif.sistema_cafeteria.core.caja;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
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
public class Turno {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario cajero;

    @Column(name = "d_fecha_hora_apertura", nullable = false)
    private LocalDateTime fechaHoraApertura;

    @Column(name = "d_fecha_hora_cierre")
    private LocalDateTime fechaHoraCierre;

    @Column(name = "n_fondo_inicial", nullable = false, precision = 10, scale = 2)
    private BigDecimal fondoInicial;

    @Builder.Default
    @Column(name = "n_total_ingresos", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalIngresos = BigDecimal.ZERO;

    @Column(name = "n_total_fisico_cierre", precision = 10, scale = 2)
    private BigDecimal totalFisicoCierre;

    @Column(name = "n_diferencia", precision = 10, scale = 2)
    private BigDecimal diferencia;

    @Column(name = "b_activo", nullable = false)
    private Boolean estaActivo;

}