package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;

@Entity
@Table(name = "cliente")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder 
@NoArgsConstructor
@AllArgsConstructor
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pn_id")
    private Long pnId;

    @Column(name = "s_nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "s_telefono", length = 20)
    private String telefono;

    @Column(name = "telefono", length = 20)
    private String telefonoLegacy; // Por compatibilidad con columna física

    @Column(name = "s_email", unique = true, length = 100)
    private String email;

    @Column(name = "email", length = 150)
    private String emailLegacy; // Por compatibilidad con columna física

    @Column(name = "preferencia_notificacion", length = 255)
    @Builder.Default
    private String preferenciaNotificacion = "EMAIL";

    @Column(name = "saldo_deudor")
    @Builder.Default
    private BigDecimal saldoDeudor = BigDecimal.ZERO;

    @Column(name = "numero_control_empleado", length = 50)
    private String numeroControlEmpleado;

    @Column(name = "s_area", length = 150)
    private String area; // Area del edificio a la que pertenece el empleado

    @Column(name = "password", length = 255)
    private String password;

    // false mientras el cliente conserva la contrasena temporal (codigo + CAFE).
    // Se obliga a cambiarla en el primer inicio de sesion.
    @Column(name = "b_password_cambiada")
    @Builder.Default
    private Boolean passwordCambiada = false;

    @Column(name = "b_activo")
    @Builder.Default
    private Boolean activo = true;

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable(); 
}