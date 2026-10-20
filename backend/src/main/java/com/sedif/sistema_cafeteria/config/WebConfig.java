package com.sedif.sistema_cafeteria.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Configuracion CORS dinamica para la API REST.
 * Soporta cambios de IP en red local (LAN) y tuneles de desarrollo.
 */
@Configuration
public class WebConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOriginsProperty;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> patronesPermitidos = new ArrayList<>();

        // 1. Agregar los origenes definidos en application.properties / .env
        if (allowedOriginsProperty != null && !allowedOriginsProperty.isBlank()) {
            Arrays.stream(allowedOriginsProperty.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach(patronesPermitidos::add);
        }

        // 2. Comodines para que NUNCA falle si cambia la IP en la red local o tuneles
        patronesPermitidos.addAll(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://10.*:*",              // Acepta cualquier IP en rango 10.x.x.x
            "http://192.168.*:*",         // Acepta cualquier IP en rango 192.168.x.x
            "http://172.*:*",             // Redes privadas 172.16.0.0/12
            "http://10.*",                // Mismas redes sin puerto explicito (puerto 80)
            "http://192.168.*",
            "http://172.*",
            "https://*.trycloudflare.com",// Cloudflare Tunnels
            "https://*.loca.lt",          // Localtunnel
            "https://*.ngrok-free.app"    // Ngrok
        ));

        // Asignar mediante setAllowedOriginPatterns (soporta comodines * con allowCredentials=true)
        configuration.setAllowedOriginPatterns(patronesPermitidos);
        
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}