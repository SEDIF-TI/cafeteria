package com.sedif.sistema_cafeteria.core.caja;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/v1/turnos")
@RequiredArgsConstructor
public class TurnoResource {

    private final TurnoService turnoService;

    @PostMapping("/abrir")
    public ResponseEntity<TurnoResponse> abrirTurno(
            @RequestBody @Valid AperturaTurnoRequest request,
            Authentication authentication) { 
        
        // Extraemos el "subject" del JWT (generalmente el email o nombre de usuario)
        String usuarioLogueado = authentication.getName();
        
        Turno turno = turnoService.abrirTurno(usuarioLogueado, request.fondoCaja());
        return ResponseEntity.ok(new TurnoResponse(turno));
    }
}