package com.sedif.sistema_cafeteria.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer; 

import java.util.Arrays;
import java.util.List;

/**
 * Canal STOMP sobre WebSocket que alimenta en tiempo real el panel de soporte.
 *
 * <p>El cliente abre la conexion contra {@code /ws-tickets}, se suscribe a los
 * destinos bajo {@code /topic} para recibir los avisos que emite el servidor y
 * publica en {@code /app} los mensajes dirigidos a los metodos anotados con
 * {@code @MessageMapping}. El broker es el simple en memoria de Spring, sin
 * intermediario externo.</p>
 *
 * <p>Los origenes admitidos en el handshake se leen de
 * {@code app.cors.allowed-origins}, la misma propiedad que usa
 * {@link WebConfig} para la API REST, de modo que ambos canales no puedan
 * quedar desincronizados al desplegar en otro dominio.</p>
 */
@Configuration
//@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final List<String> origenesPermitidos;

    public WebSocketConfig(@Value("${app.cors.allowed-origins}") String origenes) {
        this.origenesPermitidos = Arrays.stream(origenes.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toList();
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Punto de entrada del handshake. Se declara la lista explicita de
        // origenes y no el comodin "*": con SockJS el navegador envia
        // credenciales, y un comodin permitiria a cualquier sitio abrir el
        // canal aprovechando la sesion activa del usuario.
        registry.addEndpoint("/ws-tickets")
                .setAllowedOrigins(origenesPermitidos.toArray(String[]::new))
                // Respaldo por HTTP para las redes donde un proxy corporativo
                // bloquea el WebSocket nativo.
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Destinos de salida: el broker en memoria reparte a los suscriptores
        // lo que el servidor publica bajo /topic.
        config.enableSimpleBroker("/topic");

        // Destinos de entrada: lo que el cliente envia bajo /app se encamina a
        // los metodos @MessageMapping de la aplicacion.
        config.setApplicationDestinationPrefixes("/app");
    }
}
