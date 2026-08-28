package com.sedif.sistema_cafeteria.security;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    public static final String CLAIM_ROL = "rol";
    public static final String CLAIM_NOMBRE = "nombre";

    private final SecretKey claveFirma;
    private final long vigenciaMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration:3600000}") long vigenciaMs) {
        this.claveFirma = construirClave(secret);
        this.vigenciaMs = vigenciaMs;
    }

    public String generarToken(Usuario usuario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_ROL, usuario.getRol() != null ? usuario.getRol().name() : null);
        claims.put(CLAIM_NOMBRE, usuario.getNombre());

        Date ahora = new Date();
        Date expiracion = new Date(ahora.getTime() + vigenciaMs);

        return Jwts.builder()
                .claims(claims)
                .subject(usuario.getUsername())
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(claveFirma)
                .compact();
    }

    public String extraerIdentificador(String token) {
        Claims claims = parsear(token);
        return claims != null ? claims.getSubject() : null;
    }

    public boolean isTokenValido(String token) {
        return parsear(token) != null;
    }

    private Claims parsear(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(claveFirma)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("Token expirado.");
        } catch (SignatureException e) {
            log.warn("Token con firma invalida: posible intento de falsificacion.");
        } catch (MalformedJwtException | UnsupportedJwtException e) {
            log.warn("Token mal formado o de un tipo no soportado.");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Token rechazado durante la validacion.");
        }
        return null;
    }

    private SecretKey construirClave(String secret) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret.trim());
        } catch (IllegalArgumentException noEsBase64) {
            bytes = secret.trim().getBytes(StandardCharsets.UTF_8);
        }
        return Keys.hmacShaKeyFor(bytes);
    }
}