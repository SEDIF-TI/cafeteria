package com.sedif.sistema_cafeteria.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita el ritmo de peticiones contra los endpoints de autenticacion para
 * frenar los ataques de fuerza bruta sobre las contrasenas.
 *
 * <p>Emplea una cubeta de tokens de Bucket4j por cada combinacion de IP y ruta:
 * cada peticion consume un token y la cubeta se rellena por completo, de golpe,
 * al cumplirse el periodo de recarga. Con los valores por defecto
 * ({@code app.rate-limit.capacity} 5 y {@code app.rate-limit.refill-minutes} 1)
 * eso son cinco intentos por minuto y por IP en cada ruta vigilada. Agotar el
 * limite de login no afecta al resto de rutas, porque cada una tiene su propia
 * cubeta.</p>
 *
 * <p>Las cubetas se guardan en un mapa concurrente en memoria y solo se crean
 * cuando llega la primera peticion de esa clave. Al agotarse los tokens se
 * responde {@code 429 Too Many Requests} con el mismo envoltorio JSON del resto
 * de la API, sin continuar la cadena de filtros. La propiedad
 * {@code app.rate-limit.enabled} desactiva el filtro por completo.</p>
 *
 * <p>Detras de un reverse proxy la IP de la conexion es la del propio proxy, de
 * modo que todas las peticiones compartirian una unica cubeta. Por eso la IP se
 * toma de {@code X-Forwarded-For} o {@code X-Real-IP} cuando estan presentes, y
 * en produccion se exige {@code server.forward-headers-strategy=framework}.</p>
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    /** Rutas vigiladas: las que aceptan credenciales sin autenticacion previa. */
    private static final Set<String> RUTAS_PROTEGIDAS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/registro"
    );

    /**
     * Una cubeta por clave "ip|ruta". El mapa es concurrente porque el filtro
     * se ejecuta en paralelo desde varios hilos del contenedor, y las cubetas
     * se crean con {@code computeIfAbsent} para que dos peticiones simultaneas
     * de la misma clave compartan una sola instancia.
     */
    private final Map<String, Bucket> cubetas = new ConcurrentHashMap<>();

    private final boolean habilitado;
    private final long capacidad;
    private final Duration periodoRecarga;

    public RateLimitingFilter(
            @Value("${app.rate-limit.enabled:true}") boolean habilitado,
            @Value("${app.rate-limit.capacity:5}") long capacidad,
            @Value("${app.rate-limit.refill-minutes:1}") long minutosRecarga) {
        this.habilitado = habilitado;
        this.capacidad = capacidad;
        this.periodoRecarga = Duration.ofMinutes(minutosRecarga);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String clave = obtenerIpCliente(request) + "|" + request.getServletPath();
        Bucket cubeta = cubetas.computeIfAbsent(clave, k -> crearCubeta());

        if (cubeta.tryConsume(1)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Se registra la ruta, no la IP, para no acumular datos personales en
        // los logs mas alla de lo necesario.
        log.warn("Limite de peticiones superado en {}", request.getServletPath());
        responderDemasiadasPeticiones(response);
    }

    /**
     * Restringe el filtro a las rutas de autenticacion, de modo que el resto de
     * la API no paga ningun coste. Tambien lo desactiva por completo cuando
     * {@code app.rate-limit.enabled} es falso.
     */
    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        if (!habilitado) {
            return true;
        }
        // Las preflight CORS no llevan credenciales: no son intentos de acceso
        // y consumirian tokens de la cubeta sin motivo.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return !RUTAS_PROTEGIDAS.contains(request.getServletPath());
    }

    private Bucket crearCubeta() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacidad)
                        .refillIntervally(capacidad, periodoRecarga)
                        .build())
                .build();
    }

    /**
     * Resuelve la IP del cliente. {@code X-Forwarded-For} puede traer la cadena
     * completa de proxies separada por comas, y en ella el primer elemento es
     * el cliente original.
     */
    private String obtenerIpCliente(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Responde 429 escribiendo directamente en la respuesta, porque el filtro
     * actua antes de que la peticion llegue a ningun controlador y no puede
     * apoyarse en el manejador global de excepciones. El cuerpo mantiene el
     * envoltorio JSON del resto de la API.
     */
    private void responderDemasiadasPeticiones(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"success":false,"message":"Demasiados intentos. Espere unos minutos e intente de nuevo.","data":null}\
                """);
    }
}
