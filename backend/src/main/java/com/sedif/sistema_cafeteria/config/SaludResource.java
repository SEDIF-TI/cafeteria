package com.sedif.sistema_cafeteria.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * Comprobacion de que el servidor responde.
 *
 * <p>Lo consume el sondeo de {@code useNetworkStatus} del frontend, que cada
 * treinta segundos necesita distinguir "no hay internet" de "el servidor no
 * contesta".</p>
 *
 * <p>Acepta GET y HEAD, y no toca la base de datos ni ninguna otra dependencia:
 * solo confirma que el proceso acepta peticiones. Es publico a proposito, ya
 * que la pantalla de acceso lo llama antes de que exista sesion, y por eso no
 * revela nada: ni version, ni estado de dependencias, ni datos de la
 * aplicacion.</p>
 *
 * <p>La ruta debe corresponder a un controlador real. Una URL sin controlador
 * la rechaza Spring Security con 403 antes de que el filtro de CORS anada sus
 * cabeceras, y el navegador presenta ese rechazo como un error de CORS que
 * haria pasar por caido a un backend perfectamente en pie.</p>
 */
@RestController
@RequestMapping("/api/salud")
public class SaludResource {

    @RequestMapping(method = { RequestMethod.GET, RequestMethod.HEAD })
    public ResponseEntity<Void> comprobar() {
        // Cuerpo vacio: al sondeo le basta el codigo de respuesta, y asi la
        // comprobacion es lo mas barata posible pese a repetirse sin descanso.
        return ResponseEntity.noContent().build();
    }
}
