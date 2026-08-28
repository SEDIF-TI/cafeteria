package com.sedif.sistema_cafeteria.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Envoltorio uniforme de todas las respuestas de la API.
 *
 * <p>Formato: <code>{ success, message, data }</code>.</p>
 *
 * <p>Con este envoltorio el cliente lee siempre {@code success} para saber si
 * la operacion prospero, {@code message} para el texto que puede mostrar al
 * usuario y {@code data} para el contenido, sin tratar cada endpoint como un
 * caso especial. Lo emplean tanto los controladores como
 * {@link GlobalExceptionHandler}, de modo que exito y error comparten
 * forma.</p>
 *
 * <p>La inclusion es {@code ALWAYS}: los tres campos viajan aunque valgan
 * {@code null}, para que el cliente pueda contar con su presencia.</p>
 *
 * @param <T> tipo del contenido devuelto.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data
) {

    /** Respuesta correcta con datos y mensaje por defecto. */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, MessageConstants.OPERACION_EXITOSA, data);
    }

    /** Respuesta correcta con datos y mensaje propio. */
    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, message, data);
    }

    /** Respuesta correcta sin contenido (por ejemplo, tras un borrado). */
    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, message, null);
    }

    /**
     * Respuesta de error. El mensaje debe ser apto para mostrarse al usuario:
     * nunca una traza de pila ni detalles internos del servidor.
     */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }

    /**
     * Respuesta de error con contenido adicional, como el mapa de campo a
     * mensaje que acompana a un fallo de validacion.
     */
    public static <T> ApiResponse<T> error(String message, T data) {
        return new ApiResponse<>(false, message, data);
    }
}
