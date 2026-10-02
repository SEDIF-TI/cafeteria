package com.sedif.sistema_cafeteria.core.notificaciones;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void enviarCorreo(String destinatario, String asunto, String mensaje) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(destinatario);
        mail.setSubject(asunto);
        mail.setText(mensaje);
        
        // Opcional: Si quieres forzar que el remitente tenga un nombre específico, descomenta la siguiente línea
        // mail.setFrom("Cafetería SEDIF <tu_correo@gmail.com>");
        
        mailSender.send(mail);
    }
}