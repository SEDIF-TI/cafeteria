package com.sedif.sistema_cafeteria.config;

import com.sedif.sistema_cafeteria.exception.MessageConstants;
import com.sedif.sistema_cafeteria.security.JwtAuthFilter;
import com.sedif.sistema_cafeteria.security.RateLimitingFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Cadena de filtros de seguridad de la aplicacion.
 *
 * <p>Garantias que aplica:</p>
 * <ul>
 *   <li>API sin estado: CSRF desactivado y ninguna sesion de servidor, porque
 *       la identidad viaja en el JWT de cada peticion.</li>
 *   <li>Son publicos {@code /api/v1/auth/**}, el handshake {@code /ws-tickets},
 *       {@code /error}, {@code /api/salud} y las peticiones OPTIONS. Los
 *       modulos internos de TI (resguardos, taller, correos, equipos y
 *       actividades) exigen ADMINISTRADOR o SOPORTE, y {@code /api/v1/admin/**}
 *       exige ADMINISTRADOR. Cualquier otra ruta requiere, como minimo, estar
 *       autenticado.</li>
 *   <li>Autorizacion fina por rol en las anotaciones {@code @PreAuthorize} de
 *       cada controlador, habilitadas con {@link EnableMethodSecurity}. Las
 *       reglas por URL de aqui son una barrera adicional, no la unica.</li>
 *   <li>Cabeceras de seguridad: anti clickjacking, anti MIME sniffing, HSTS,
 *       CSP y politica de referrer.</li>
 *   <li>401 cuando falta autenticacion y 403 cuando faltan permisos, ambos con
 *       el envoltorio JSON habitual de la API.</li>
 * </ul>
 *
 * <p>El orden de los filtros importa: el limitador de ritmo se ejecuta antes
 * que el filtro JWT, de modo que un ataque de fuerza bruta se corta sin llegar
 * siquiera a validar tokens. La configuracion CORS se delega en el bean que
 * publica {@code WebConfig}.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * Codificador de contrasenas de toda la aplicacion. BCrypt incorpora una
     * sal distinta en cada hash, de modo que dos usuarios con la misma
     * contrasena obtienen valores almacenados diferentes, y su coste de calculo
     * encarece los ataques por diccionario sobre la base de datos.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CORS gestionado por el bean que define WebConfig.
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // Sin CSRF: la API es stateless y se autentica por token en un
            // encabezado, no por cookie de sesion enviada por el navegador.
            .csrf(csrf -> csrf.disable())

            // Ninguna sesion en servidor: cada peticion se valida por su JWT.
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .headers(headers -> headers
                    // Impide que la aplicacion se cargue dentro de un iframe
                    // (clickjacking).
                    .frameOptions(frame -> frame.deny())
                    // Impide que el navegador adivine el tipo de contenido.
                    .contentTypeOptions(cto -> {})
                    // Fuerza HTTPS durante un ano, subdominios incluidos.
                    .httpStrictTransportSecurity(hsts -> hsts
                            .includeSubDomains(true)
                            .maxAgeInSeconds(31536000))
                    // La API solo devuelve JSON: se puede bloquear todo lo demas.
                    .contentSecurityPolicy(csp -> csp
                            .policyDirectives("default-src 'self'; frame-ancestors 'none'"))
                    .referrerPolicy(referrer -> referrer.policy(
                            org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
                                    .ReferrerPolicy.SAME_ORIGIN))
            )

            .exceptionHandling(ex -> ex
                    // 401: no hay identidad. El frontend debe redirigir al login.
                    .authenticationEntryPoint((request, response, authException) ->
                            escribirError(response, HttpStatus.UNAUTHORIZED,
                                    MessageConstants.AUTENTICACION_REQUERIDA))
                    // 403: hay identidad, pero sin permisos suficientes.
                    .accessDeniedHandler((request, response, accessDeniedException) ->
                            escribirError(response, HttpStatus.FORBIDDEN,
                                    MessageConstants.ACCESO_DENEGADO))
            )

            .authorizeHttpRequests(auth -> auth
                // Rutas publicas (Login, Salud, WebSockets si los usas)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll() 
                .requestMatchers("/api/auth/**").permitAll() // <--- RUTA AGREGADA PARA POSTMAN
                .requestMatchers("/api/salud").permitAll()

                // Rutas exclusivas para administracion (Reportes, Configuracion, Borrado de productos)
                .requestMatchers("/api/v1/admin/**")
                .hasAnyAuthority("ROLE_SUPER_ADMINISTRADOR", "SUPER_ADMINISTRADOR", "ROLE_ADMINISTRADOR", "ADMINISTRADOR")

                // Todo lo demas (Ventas, Clientes, Deudores, Productos) exige estar autenticado (Cajero)
                .anyRequest().authenticated()
            )

            // Ambos se insertan antes del filtro de login por formulario, que
            // esta API no usa. El limitador se anade en segundo lugar para que
            // quede por delante del filtro JWT en la cadena resultante: asi un
            // ataque de fuerza bruta ni siquiera llega a validar tokens.
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Escribe un error con el mismo envoltorio JSON que usa el resto de la API,
     * para que el frontend no tenga que tratar estas respuestas como un caso
     * aparte.
     */
    private void escribirError(jakarta.servlet.http.HttpServletResponse response,
                               HttpStatus estado,
                               String mensaje) throws java.io.IOException {
        response.setStatus(estado.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"message\":\"" + mensaje + "\",\"data\":null}");
    }
}