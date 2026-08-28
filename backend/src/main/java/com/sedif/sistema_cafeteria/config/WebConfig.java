package com.sedif.sistema_cafeteria.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuracion CORS de la API REST.
 *
 * <p>Publica el {@link CorsConfigurationSource} que consume
 * {@code SecurityConfig}, aplicado a todas las rutas. Los origenes permitidos
 * se leen de {@code app.cors.allowed-origins} separados por coma, de modo que
 * cambiar de dominio es cuestion de configuracion y no exige recompilar.</p>
 *
 * <p>{@code WebSocketConfig} lee esa misma propiedad para el handshake, con lo
 * que ambos canales no pueden quedar desincronizados.</p>
 */
@Configuration
public class WebConfig {

    private final List<String> origenesPermitidos;

    public WebConfig(@Value("${app.cors.allowed-origins}") String origenes) {
        this.origenesPermitidos = Arrays.stream(origenes.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toList();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Lista explicita de origenes. No se usa el comodin "*" porque es
        // incompatible con allowCredentials y permitiria que cualquier sitio
        // llamara a la API desde el navegador de un usuario con sesion activa.
        config.setAllowedOrigins(origenesPermitidos);

        // HEAD figura en la lista porque el sondeo de conectividad del frontend
        // lo usa cada treinta segundos: pide solo las cabeceras, sin descargar
        // cuerpo. Un metodo ausente aqui hace que el navegador rechace el
        // preflight y lo reporte como error de CORS.
        config.setAllowedMethods(List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));

        // Sin exponerlo, el navegador oculta este encabezado al codigo del
        // frontend y las descargas de PDF (memorandums y requisiciones) pierden
        // el nombre del archivo.
        config.setExposedHeaders(List.of("Content-Disposition"));

        config.setAllowCredentials(true);

        // El navegador cachea la respuesta preflight una hora, lo que evita una
        // peticion OPTIONS por cada llamada a la API.
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
