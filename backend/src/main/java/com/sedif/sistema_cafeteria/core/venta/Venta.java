package com.sedif.sistema_cafeteria.core.venta;

import com.sedif.sistema_cafeteria.core.cliente.Cliente;
import com.sedif.sistema_cafeteria.core.usuarios.Usuario; 
import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "venta")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pn_id")
    private Long pnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pn_usuario_id", nullable = false)
    private Usuario usuario; // Cajero que registró la venta

    @Column(name = "pn_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetalleVenta> detalles;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pn_cliente_id", nullable = true) 
    private Cliente cliente;

    @Enumerated(EnumType.STRING)
    @Column(name = "s_estado", nullable = false, length = 20)
    private EstadoVenta estado;

    // Agregamos el campo para mapear el método de pago en la base de datos
    @Column(name = "s_metodo_pago", nullable = false, length = 50)
    private String metodoPago; // O @Enumerated(EnumType.STRING) si usas un Enum

    // Suma de abonos parciales. Saldo pendiente = total - montoAbonado
    @Column(name = "pn_monto_abonado", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal montoAbonado = BigDecimal.ZERO;

    public BigDecimal getSaldoPendiente() {
        BigDecimal abonado = montoAbonado != null ? montoAbonado : BigDecimal.ZERO;
        return total == null ? BigDecimal.ZERO : total.subtract(abonado);
    }

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable();
}