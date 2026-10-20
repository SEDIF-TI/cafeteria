package com.sedif.sistema_cafeteria.core.cliente;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Codigo de un solo uso para restablecer la contrasena del cliente. El codigo
 * viaja solo al correo registrado; aqui se guarda cifrado, con vencimiento y un
 * contador de intentos para frenar la fuerza bruta.
 */
@Entity
@Table(name = "cliente_reset_token")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    /** Hash BCrypt del codigo de 6 digitos: nunca se guarda en claro. */
    @Column(nullable = false, length = 255)
    private String codigoHash;

    @Column(nullable = false)
    private LocalDateTime expiracion;

    @Builder.Default
    @Column(nullable = false)
    private Integer intentos = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean usado = false;

    public boolean estaVigente() {
        return !usado && LocalDateTime.now().isBefore(expiracion);
    }
}
