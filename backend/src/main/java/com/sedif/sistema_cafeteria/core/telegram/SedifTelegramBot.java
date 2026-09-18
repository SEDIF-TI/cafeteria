package com.sedif.sistema_cafeteria.core.telegram;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;

/**
 * Bot que atiende la vinculacion de cuentas y entrega las notificaciones.
 *
 * <p>Telegram no revela quien esta detras de un chat, asi que la
 * correspondencia entre persona y conversacion se establece con el parametro
 * de arranque: el sistema ofrece al tecnico un enlace
 * {@code /start &lt;idUsuario&gt;} y, cuando lo pulsa, este bot recibe a la vez
 * ese identificador y el {@code chatId} de la conversacion. Guardar el segundo
 * en el usuario es lo que permite despues escribirle de forma directa.</p>
 *
 * <p>Funciona por long polling: la sesion registrada en {@link BotConfig}
 * consulta a Telegram e invoca {@link #onUpdateReceived} por cada mensaje.</p>
 */
@Component
@Slf4j
public class SedifTelegramBot extends TelegramLongPollingBot {

    private final UsuarioRepository usuarioRepository;

    @Value("${telegram.bot.username}")
    private String botUsername;

    public SedifTelegramBot(@Value("${telegram.bot.token}") String botToken, UsuarioRepository usuarioRepository) {
        super(botToken);
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public String getBotUsername() {
        return botUsername;
    }

    /**
     * Procesa cada mensaje entrante y atiende el comando de vinculacion.
     *
     * <p>El {@code @Transactional} es necesario porque el metodo lo invoca el
     * hilo de long polling de la libreria, fuera de cualquier peticion web: sin
     * el no habria transaccion en curso en la que persistir el {@code chatId}.</p>
     */
    @Override
    @Transactional
    public void onUpdateReceived(Update update) {
        log.debug("Mensaje entrante de Telegram.");

        if (update.hasMessage() && update.getMessage().hasText()) {
            String messageText = update.getMessage().getText();
            Long chatId = update.getMessage().getChatId();

            // El texto y el identificador del chat son datos personales, asi
            // que la traza no los incluye.
            log.debug("Procesando comando de Telegram.");

            if (messageText.startsWith("/start")) {
                try {
                    String idString = messageText.replace("/start", "").trim();

                    // Sin identificador, la persona abrio el bot por su cuenta
                    // y no desde el enlace del perfil: no hay a quien vincular.
                    if (idString.isEmpty()) {
                        enviarMensaje(chatId, "Bienvenido. Por favor, vincula tu cuenta dando clic al botón desde el perfil de tu sistema SEDIF.");
                        return;
                    }

                    Long usuarioId = Long.parseLong(idString);
                    log.debug("Vinculando cuenta de Telegram para el usuario id={}", usuarioId);

                    Usuario tecnico = usuarioRepository.findById(usuarioId).orElse(null);
                    
                    if (tecnico != null) {
                        log.debug("Usuario id={} localizado para vinculacion.", usuarioId);
                        
                        tecnico.setTelegramChatId(chatId);

                        // La escritura se vuelca de inmediato para que el chat
                        // quede vinculado antes de confirmarselo al usuario.
                        usuarioRepository.saveAndFlush(tecnico); 
                        
                        log.info("Cuenta de Telegram vinculada al usuario id={}", usuarioId);
                        
                        enviarMensaje(chatId, "¡Hola " + tecnico.getNombre() + "! Tu cuenta ha sido vinculada exitosamente al Sistema de Tickets SEDIF. A partir de ahora recibirás tus notificaciones aquí.");
                    } else {
                        log.warn("Intento de vinculacion con un usuario inexistente: id={}", usuarioId);
                        enviarMensaje(chatId, "Error: No se encontró ningún usuario con ese ID en el sistema.");
                    }
                } catch (NumberFormatException e) {
                    log.warn("Intento de vinculacion con un identificador no numerico.");
                } catch (Exception e) {
                    log.error("Error al procesar el mensaje de Telegram.", e);
                }
            }
        }
    }

    /**
     * Envia un mensaje a un chat vinculado, interpretando Markdown.
     *
     * <p>Propaga la excepcion en lugar de capturarla para que quien notifica
     * decida como reaccionar ante un fallo de entrega.</p>
     */
    public void enviarMensaje(Long chatId, String texto) throws TelegramApiException {
        SendMessage message = new SendMessage();
        message.setChatId(String.valueOf(chatId));
        message.setText(texto);

        message.setParseMode("Markdown");
        execute(message);
    }
}

