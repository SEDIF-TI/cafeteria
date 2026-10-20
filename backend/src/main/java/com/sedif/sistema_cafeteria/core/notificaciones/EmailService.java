package com.sedif.sistema_cafeteria.core.notificaciones;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    /** Logo embebido en el cuerpo del correo (referenciado como cid:logoCafeteria). */
    private static final String LOGO_CID = "logoCafeteria";
    private static final String LOGO_RUTA = "static/logo-puebla.png";

    public void enviarCorreo(String destinatario, String asunto, String mensaje) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(destinatario);
        mail.setSubject(asunto);
        mail.setText(mensaje);
        mailSender.send(mail);
    }

    /**
     * Envia un correo con cuerpo HTML y el logo de la cafeteria incrustado.
     * El HTML debe referenciar el logo como: <img src="cid:logoCafeteria" />
     */
    public void enviarCorreoHtml(String destinatario, String asunto, String cuerpoHtml) {
        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            // multipart=true para poder adjuntar el logo en linea
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(cuerpoHtml, true); // true = es HTML

            ClassPathResource logo = new ClassPathResource(LOGO_RUTA);
            if (logo.exists()) {
                helper.addInline(LOGO_CID, logo, "image/png");
            }

            mailSender.send(mensaje);
        } catch (Exception e) {
            // Si algo falla con el HTML, se intenta un envio simple como respaldo.
            throw new RuntimeException("No se pudo enviar el correo HTML: " + e.getMessage(), e);
        }
    }
}
