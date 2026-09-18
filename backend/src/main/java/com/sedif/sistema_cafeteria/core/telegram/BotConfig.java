package com.sedif.sistema_cafeteria.core.telegram;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

/**
 * Registro del bot de Telegram contra la API de long polling.
 *
 * <p>El bean solo se crea si {@code telegram.bot.enabled} es {@code true}.
 * Telegram entrega cada mensaje a un unico consumidor, de modo que dos
 * instancias conectadas con el mismo token se disputan los mensajes entrantes
 * y ambas reciben "[409] Conflict: terminated by other getUpdates request".
 * Condicionar el arranque evita que un entorno de desarrollo robe las
 * notificaciones al de produccion.</p>
 *
 * <p>{@code matchIfMissing = false} deja el bot desactivado cuando la
 * propiedad no esta definida, que es la opcion prudente: activarlo por
 * descuido afecta al entorno de produccion, no al local.</p>
 */
@Configuration
@Slf4j
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true", matchIfMissing = false)
public class BotConfig {

    /**
     * Arranca la sesion de long polling: a partir del registro, el bot queda a
     * la escucha de los mensajes entrantes.
     *
     * <p>Un fallo aqui no impide levantar la aplicacion. El sistema de tickets
     * sigue siendo utilizable sin notificaciones por Telegram, de modo que el
     * error se registra y el resto del arranque continua.</p>
     */
    @Bean
    public TelegramBotsApi telegramBotsApi(SedifTelegramBot sedifTelegramBot) {
        try {
            TelegramBotsApi api = new TelegramBotsApi(DefaultBotSession.class);

            api.registerBot(sedifTelegramBot);

            log.info("Bot de Telegram registrado correctamente.");
            return api;

        } catch (TelegramApiException e) {
            log.error("No se pudo iniciar el bot de Telegram. Las notificaciones quedaran desactivadas.", e);
            return null;
        }
    }
}