package com.sedif.sistema_cafeteria.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    /** Reglas de negocio incumplidas: 400. Los servicios lanzan esta excepcion. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> manejarArgumentoInvalido(IllegalArgumentException ex) {
        // El mensaje procede del propio codigo, no de la infraestructura,
        // por lo que es seguro mostrarlo.
        return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Estado incompatible con la operacion solicitada: 409. La peticion es
     * valida en si misma, pero choca con la situacion actual del recurso.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> manejarEstadoInvalido(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getMessage()));
    }

    /** JSON mal formado o ilegible: 400. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> manejarCuerpoIlegible(HttpMessageNotReadableException ex) {
        // No se propaga ex.getMessage() al cliente: revelaria nombres de clases
        // internas. En el log basta el tipo de la causa para diagnosticar.
        log.debug("Cuerpo de peticion ilegible: {}", ex.getMostSpecificCause().getClass().getSimpleName());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(MessageConstants.PETICION_MAL_FORMADA));
    }

    /** Falta un parametro obligatorio en la query string: 400. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> manejarParametroFaltante(
            MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Falta el parametro obligatorio: " + ex.getParameterName()));
    }

    /**
     * Tipo incorrecto en un parametro, por ejemplo texto donde se espera un id:
     * 400. Se nombra el parametro, pero no el tipo esperado.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> manejarTipoInvalido(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("El valor de '" + ex.getName() + "' no tiene el formato esperado."));
    }

    /**
     * Usuario autenticado sin permisos suficientes: 403, que es lo correcto
     * cuando la identidad es conocida. La lanza Spring Security al evaluar los
     * {@code @PreAuthorize} y las reglas por URL.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> manejarAccesoDenegado(AccessDeniedException ex) {
        log.warn("Acceso denegado a un recurso protegido.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(MessageConstants.ACCESO_DENEGADO));
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
    public ResponseEntity<ApiResponse<Void>> manejarViolacionDePermisos(SecurityException ex) {
        log.warn("Intento de operar sobre un recurso fuera del alcance del usuario: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ex.getMessage() != null
                        ? ex.getMessage()
                        : MessageConstants.ACCESO_DENEGADO));
    }

    /**
     * Fallo de autenticacion: 401, no 403. La distincion importa porque permite
     * al frontend diferenciar "sesion caducada", que se resuelve volviendo al
     * login, de "sin permisos", donde reintentar no sirve de nada.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> manejarAutenticacion(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(MessageConstants.AUTENTICACION_REQUERIDA));
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
    public ResponseEntity<ApiResponse<Void>> manejarRecursoNoEncontrado(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {

        log.debug("Ruta no encontrada: {}", ex.getResourcePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(MessageConstants.RECURSO_NO_ENCONTRADO));
    }

    /**
     * Ruta sin controlador: 404. Solo llega aqui si se activa
     * {@code spring.mvc.throw-exception-if-no-handler-found}.
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Void>> manejarRutaNoEncontrada(NoHandlerFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(MessageConstants.RECURSO_NO_ENCONTRADO));
    }

    /**
     * Red de seguridad para cualquier fallo no contemplado: 500.
     *
     * <p>Se registra la excepcion completa, con su traza, en el servidor, y al
     * cliente solo se le envia un mensaje generico. Es lo que impide que una
     * traza de pila o un error de base de datos acabe en el navegador.</p>
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> manejarErrorInesperado(Exception ex) {
        log.error("Error no controlado en la aplicacion", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(MessageConstants.ERROR_INTERNO));
    }
}
