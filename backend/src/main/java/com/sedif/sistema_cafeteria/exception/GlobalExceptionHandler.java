package com.sedif.sistema_cafeteria.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;

/**
 * Traduce las excepciones de toda la aplicacion a respuestas
 * {@link ApiResponse} con el codigo HTTP adecuado.
 *
 * <p>Al ser un {@link RestControllerAdvice}, intercepta lo que escapa de
 * cualquier controlador. Cumple dos objetivos:</p>
 * <ul>
 *   <li><b>Seguridad:</b> ninguna traza de pila ni detalle interno llega al
 *       cliente. Los fallos inesperados se registran completos en el servidor
 *       y hacia fuera se devuelve un mensaje generico.</li>
 *   <li><b>Consistencia:</b> los controladores dejan de necesitar
 *       {@code try/catch} y devuelven siempre el mismo formato.</li>
 * </ul>
 *
 * <p>Correspondencia entre excepcion y codigo HTTP:</p>
 * <ul>
 *   <li><b>400</b> — {@code MethodArgumentNotValidException} (con el detalle
 *       por campo), {@code IllegalArgumentException},
 *       {@code HttpMessageNotReadableException},
 *       {@code MissingServletRequestParameterException} y
 *       {@code MethodArgumentTypeMismatchException}.</li>
 *   <li><b>401</b> — {@code AuthenticationException}.</li>
 *   <li><b>403</b> — {@code AccessDeniedException} y {@code SecurityException}.</li>
 *   <li><b>404</b> — {@code NoResourceFoundException} y
 *       {@code NoHandlerFoundException}.</li>
 *   <li><b>409</b> — {@code IllegalStateException}.</li>
 *   <li><b>500</b> — cualquier otra excepcion.</li>
 * </ul>
 *
 * <p>Spring elige siempre el manejador del tipo mas especifico, de modo que el
 * de {@code Exception} solo actua sobre lo que no encaja en ningun otro.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * MODO PRUEBAS. Si es {@code true}, cada respuesta de error incluye el
     * mensaje real, el tipo de excepcion y el codigo HTTP, para diagnosticar
     * con exactitud durante las pruebas. En produccion debe ponerse en
     * {@code false} (en application.properties: app.errores.detallados=false)
     * para no filtrar detalles internos al cliente.
     */
    @Value("${app.errores.detallados:false}")
    private boolean erroresDetallados;

    /**
     * Construye la respuesta de error. En modo pruebas expone el detalle real
     * (mensaje de la excepcion, su tipo y el codigo HTTP); en produccion solo
     * el mensaje publico recibido.
     */
    private ResponseEntity<ApiResponse<Object>> construirError(
            HttpStatus status, String mensajePublico, Exception ex) {

        if (erroresDetallados) {
            Map<String, Object> detalle = new HashMap<>();
            detalle.put("codigo", status.value());
            detalle.put("estado", status.name());
            detalle.put("tipo", ex.getClass().getSimpleName());
            detalle.put("detalle", ex.getMessage());
            String mensaje = ex.getMessage() != null ? ex.getMessage() : mensajePublico;
            return ResponseEntity.status(status).body(ApiResponse.error(mensaje, detalle));
        }
        return ResponseEntity.status(status).body(ApiResponse.error(mensajePublico));
    }

    /**
     * Errores de validacion de Bean Validation ({@code @Valid}): 400.
     *
     * <p>A diferencia del resto de manejadores, rellena el campo {@code data}
     * con un mapa de campo a mensaje, que es lo que el formulario del frontend
     * necesita para senalar cada entrada erronea.</p>
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> manejarValidacion(
            MethodArgumentNotValidException ex) {

        Map<String, String> errores = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errores.put(error.getField(), error.getDefaultMessage());
        }
        // Son errores del usuario, no del sistema: no ensucian los logs.
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(MessageConstants.DATOS_INVALIDOS, errores));
    }

    /** Recurso inexistente: 404. Los servicios lanzan EntityNotFoundException. */
    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> manejarNoEncontrado(jakarta.persistence.EntityNotFoundException ex) {
        return construirError(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
    }

    /** Reglas de negocio incumplidas: 400. Los servicios lanzan esta excepcion. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> manejarArgumentoInvalido(IllegalArgumentException ex) {
        // El mensaje procede del propio codigo, no de la infraestructura,
        // por lo que es seguro mostrarlo.
        return construirError(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    }

    /**
     * Estado incompatible con la operacion solicitada: 409. La peticion es
     * valida en si misma, pero choca con la situacion actual del recurso.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Object>> manejarEstadoInvalido(IllegalStateException ex) {
        return construirError(HttpStatus.CONFLICT, ex.getMessage(), ex);
    }

    /** JSON mal formado o ilegible: 400. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> manejarCuerpoIlegible(HttpMessageNotReadableException ex) {
        log.debug("Cuerpo de peticion ilegible: {}", ex.getMostSpecificCause().getClass().getSimpleName());
        return construirError(HttpStatus.BAD_REQUEST, MessageConstants.PETICION_MAL_FORMADA, ex);
    }

    /** Falta un parametro obligatorio en la query string: 400. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Object>> manejarParametroFaltante(
            MissingServletRequestParameterException ex) {
        return construirError(HttpStatus.BAD_REQUEST,
                "Falta el parametro obligatorio: " + ex.getParameterName(), ex);
    }

    /**
     * Tipo incorrecto en un parametro, por ejemplo texto donde se espera un id:
     * 400. Se nombra el parametro, pero no el tipo esperado.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> manejarTipoInvalido(MethodArgumentTypeMismatchException ex) {
        return construirError(HttpStatus.BAD_REQUEST,
                "El valor de '" + ex.getName() + "' no tiene el formato esperado.", ex);
    }

    /**
     * Usuario autenticado sin permisos suficientes: 403, que es lo correcto
     * cuando la identidad es conocida. La lanza Spring Security al evaluar los
     * {@code @PreAuthorize} y las reglas por URL.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> manejarAccesoDenegado(AccessDeniedException ex) {
        log.warn("Acceso denegado a un recurso protegido.");
        return construirError(HttpStatus.FORBIDDEN, MessageConstants.ACCESO_DENEGADO, ex);
    }

    /**
     * Regla de negocio que impide operar sobre un recurso ajeno: 403.
     *
     * <p>Los servicios lanzan {@link SecurityException} cuando detectan, por
     * ejemplo, que alguien intenta cerrar un ticket de otra area. Es una
     * denegacion de permisos decidida en el dominio, no por Spring Security, y
     * merece el mismo 403 que esta: tratarla como un fallo del servidor
     * confundiria al cliente sobre la causa.</p>
     *
     * <p>Aqui si se propaga el mensaje, porque lo redacta el propio servicio
     * para explicar que regla se incumplio.</p>
     */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Object>> manejarViolacionDePermisos(SecurityException ex) {
        log.warn("Intento de operar sobre un recurso fuera del alcance del usuario: {}", ex.getMessage());
        return construirError(HttpStatus.FORBIDDEN,
                ex.getMessage() != null ? ex.getMessage() : MessageConstants.ACCESO_DENEGADO, ex);
    }

    /**
     * Fallo de autenticacion: 401, no 403. La distincion importa porque permite
     * al frontend diferenciar "sesion caducada", que se resuelve volviendo al
     * login, de "sin permisos", donde reintentar no sirve de nada.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> manejarAutenticacion(AuthenticationException ex) {
        return construirError(HttpStatus.UNAUTHORIZED, MessageConstants.AUTENTICACION_REQUERIDA, ex);
    }

    /**
     * Ruta inexistente detectada por el manejador de recursos estaticos: 404.
     *
     * <p>Con la configuracion por defecto, Spring Boot no lanza
     * {@link NoHandlerFoundException} para una URL sin controlador: la deriva al
     * manejador de recursos, que termina lanzando
     * {@code NoResourceFoundException}. Es, por tanto, la excepcion que llega
     * en la practica ante una direccion mal escrita, y sin este manejador
     * acabaria en el generico como un 500.</p>
     */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Object>> manejarRecursoNoEncontrado(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {

        log.debug("Ruta no encontrada: {}", ex.getResourcePath());
        return construirError(HttpStatus.NOT_FOUND, MessageConstants.RECURSO_NO_ENCONTRADO, ex);
    }

    /**
     * Ruta sin controlador: 404. Solo llega aqui si se activa
     * {@code spring.mvc.throw-exception-if-no-handler-found}.
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Object>> manejarRutaNoEncontrada(NoHandlerFoundException ex) {
        return construirError(HttpStatus.NOT_FOUND, MessageConstants.RECURSO_NO_ENCONTRADO, ex);
    }

    /**
     * Red de seguridad para cualquier fallo no contemplado: 500.
     *
     * <p>Se registra la excepcion completa, con su traza, en el servidor, y al
     * cliente solo se le envia un mensaje generico. Es lo que impide que una
     * traza de pila o un error de base de datos acabe en el navegador.</p>
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> manejarErrorInesperado(Exception ex) {
        log.error("Error no controlado en la aplicacion", ex);
        return construirError(HttpStatus.INTERNAL_SERVER_ERROR, MessageConstants.ERROR_INTERNO, ex);
    }
}
