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
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 150)
    private String email;

    @Column(length = 20)
    private String telefono;

    @Column(name = "telegram_chat_id", length = 50)
    private String telegramChatId;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferencia_notificacion", nullable = false)
    private PreferenciaNotificacion preferenciaNotificacion;

    @Builder.Default
    @Column(name = "saldo_deudor", nullable = false, precision = 10, scale = 2)
    private BigDecimal saldoDeudor = BigDecimal.ZERO;

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable();
}