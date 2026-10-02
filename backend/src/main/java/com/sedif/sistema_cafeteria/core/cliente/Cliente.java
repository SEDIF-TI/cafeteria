package com.sedif.sistema_cafeteria.core.cliente;

import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

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
    private Long PnId;

    @Column(name = "s_nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "s_telefono", length = 20)
    private String telefono;

    @Column(name = "s_email", unique = true, length = 100)
    private String correoElectronico;

    @Column(name = "b_activo")
    @Builder.Default
    private Boolean activo = true;

    @Embedded
    @Builder.Default
    private Auditable auditable = new Auditable(); 
}