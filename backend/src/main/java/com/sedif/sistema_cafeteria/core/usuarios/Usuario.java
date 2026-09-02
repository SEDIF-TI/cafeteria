package com.sedif.sistema_cafeteria.core.usuarios;

import com.sedif.sistema_cafeteria.util.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "usuario")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pn_id")
    private Long id;

    @Column(name = "s_username", unique = true, nullable = false, length = 100)
    private String username;

    @Column(name = "s_password", nullable = false)
    private String password;

    @Column(name = "s_nombre", length = 150)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(name = "s_rol", length = 50)
    private RolUsuario rol;

    @Column(name = "b_activo")
    private boolean activo = true;

    @Embedded
    private Auditable auditable = new Auditable();
}