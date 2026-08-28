package com.sedif.sistema_cafeteria.core.usuarios;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Cambia "username" por "correo" si tu sistema de login usa email
    @Column(unique = true, nullable = false)
    private String username; 

    @Column(nullable = false)
    private String password;

    private String nombre;

    @Enumerated(EnumType.STRING)
    private RolUsuario rol;

    @Column(name = "activo")
    private boolean activo = true;
}