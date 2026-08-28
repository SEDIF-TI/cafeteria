package com.sedif.sistema_cafeteria.security;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.List;
import java.util.Set;

/**
 * Valida la clave de firma JWT durante el arranque de la aplicacion.
 *
 * <p>El metodo anotado con {@code @PostConstruct} somete el valor de
 * {@code app.jwt.secret} a tres comprobaciones: que no sea una clave de ejemplo
 * conocida, que aporte al menos 256 bits de material de clave y que tenga una
 * variedad minima de caracteres. Cualquier fallo lanza
 * {@link IllegalStateException} y el contexto de Spring no levanta.</p>
 *
 * <p>Abortar el arranque es deliberado: una clave debil permite a cualquiera
 * firmar tokens de administrador validos, y ese fallo es silencioso en marcha.
 * Es preferible que el despliegue se detenga de forma ruidosa y con un mensaje
 * que indique como generar una clave correcta.</p>
 */
@Component
public class JwtSecretValidator {

    private static final Logger log = LoggerFactory.getLogger(JwtSecretValidator.class);

    /** HMAC-SHA256 exige una clave de al menos 256 bits (32 bytes). */
    private static final int MINIMO_BYTES = 32;

    /** Numero minimo de caracteres distintos: descarta claves como "aaaa...". */
    private static final int MINIMO_CARACTERES_DISTINTOS = 12;

    /**
     * Claves que NUNCA deben usarse: circulan en tutoriales y estan indexadas
     * en buscadores y repositorios publicos, de modo que usarlas equivale a no
     * tener clave.
     */
    private static final Set<String> CLAVES_PROHIBIDAS = Set.of(
            "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
            "586E3272357538782F413F4428472B4B6250655368566D597133743677397A24",
            "413F4428472B4B6250655368566D5970337336763979244226452948404D6351",
            "secret",
            "mysecret",
            "secretkey",
            "changeme",
            "GENERA_LA_TUYA_CON_openssl_rand_base64_32"
    );

    private final String secret;

    public JwtSecretValidator(@Value("${app.jwt.secret}") String secret) {
        this.secret = secret;
    }

    @PostConstruct
    public void validar() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(mensaje(
                    "La propiedad 'app.jwt.secret' esta vacia o no definida."));
        }

        final String limpia = secret.trim();

        // 1. Claves de ejemplo conocidas. La comparacion ignora mayusculas
        //    porque las claves hexadecimales se copian en ambas formas.
        boolean prohibida = CLAVES_PROHIBIDAS.stream()
                .anyMatch(c -> c.equalsIgnoreCase(limpia));
        if (prohibida) {
            throw new IllegalStateException(mensaje(
                    "La clave configurada es una clave de EJEMPLO publicamente conocida. "
                            + "Cualquiera puede falsificar tokens con ella."));
        }

        // 2. Longitud efectiva. Se mide sobre los bytes decodificados de Base64
        //    cuando aplica, porque es lo que realmente alimenta al algoritmo HMAC.
        int bytesEfectivos = calcularBytesEfectivos(limpia);
        if (bytesEfectivos < MINIMO_BYTES) {
            throw new IllegalStateException(mensaje(String.format(
                    "La clave aporta %d bytes y HMAC-SHA256 exige al menos %d (256 bits).",
                    bytesEfectivos, MINIMO_BYTES)));
        }

        // 3. Variedad de caracteres: la longitud por si sola no basta, porque
        //    una cadena larga y repetitiva es trivial de adivinar.
        long distintos = limpia.chars().distinct().count();
        if (distintos < MINIMO_CARACTERES_DISTINTOS) {
            throw new IllegalStateException(mensaje(String.format(
                    "La clave solo tiene %d caracteres distintos (minimo %d). "
                            + "Parece generada a mano y no de forma aleatoria.",
                    distintos, MINIMO_CARACTERES_DISTINTOS)));
        }

        // Se registra la longitud efectiva, nunca la clave ni fragmentos de ella.
        log.info("Clave JWT validada correctamente: {} bytes efectivos de entropia.", bytesEfectivos);
    }

    /**
     * Devuelve cuantos bytes de material de clave aporta realmente el valor.
     * Si es Base64 valido se usa su longitud decodificada; si no, se toma la
     * longitud en bytes UTF-8 del texto plano.
     */
    private int calcularBytesEfectivos(String valor) {
        try {
            return Base64.getDecoder().decode(valor).length;
        } catch (IllegalArgumentException noEsBase64) {
            return valor.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
        }
    }

    /**
     * Compone el mensaje del fallo de arranque: indica la causa concreta y los
     * pasos para generar y configurar una clave valida, sin revelar el valor
     * rechazado.
     */
    private String mensaje(String causa) {
        return String.join(System.lineSeparator(), List.of(
                "",
                "===========================================================",
                " ARRANQUE ABORTADO: la clave de firma JWT no es segura.",
                "===========================================================",
                " Motivo: " + causa,
                "",
                " Como corregirlo:",
                "   1. Genera una clave nueva y unica para este entorno:",
                "        openssl rand -base64 32",
                "   2. Ponla en el archivo .env de la raiz del proyecto:",
                "        APP_JWT_SECRET=<la clave generada>",
                "   3. Vuelve a arrancar la aplicacion.",
                "",
                " No reutilices claves entre entornos ni las subas a git.",
                "==========================================================="
        ));
    }
}
