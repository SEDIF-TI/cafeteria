package com.sedif.sistema_cafeteria.core.utensilio;

import com.sedif.sistema_cafeteria.core.cliente.Cliente;
import com.sedif.sistema_cafeteria.core.venta.Venta;
import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Salida de utensilios fuera de la cafeteria: quien se los llevo y a que area. */
@Entity
@Table(name = "prestamo_utensilio")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrestamoUtensilio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    private Venta venta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(nullable = false, length = 50)
    private String codigoEmpleado;

    @Column(length = 150)
    private String nombreEmpleado;

    @Column(nullable = false, length = 150)
    private String area;

    @Column(nullable = false)
    private LocalDateTime fechaSalida;

    private LocalDateTime fechaDevolucion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPrestamo estado;

    @Column(length = 500)
    private String observaciones;

    @Builder.Default
    @OneToMany(mappedBy = "prestamo", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrestamoUtensilioDetalle> detalles = new ArrayList<>();

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable();
}
