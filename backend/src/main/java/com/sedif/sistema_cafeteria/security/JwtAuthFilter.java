package com.sedif.sistema_cafeteria.security;

import com.sedif.sistema_cafeteria.core.usuarios.Usuario;
import com.sedif.sistema_cafeteria.core.usuarios.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private static final String ENCABEZADO = "Authorization";
    private static final String PREFIJO = "Bearer ";

    private final JwtTokenProvider tokenProvider;
    private final UsuarioRepository usuarioRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String encabezado = request.getHeader(ENCABEZADO);

        if (encabezado == null || !encabezado.startsWith(PREFIJO)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = encabezado.substring(PREFIJO.length()).trim();
        final String identificador = tokenProvider.extraerIdentificador(token);
        
        if (identificador == null) {
            filterChain.doFilter(request, response);
            return;
        }

        buscarUsuario(identificador).ifPresent(usuario -> {
            if (!Boolean.TRUE.equals(usuario.isActivo())) {
                log.debug("Se rechazo un token de una cuenta desactivada.");
                return;
            }
            if (usuario.getRol() == null) {
                log.warn("Usuario id={} sin rol asignado: no se puede autorizar.", usuario.getId());
                return;
            }

            String autoridad = "ROLE_" + usuario.getRol().name().toUpperCase();
            String principal = usuario.getUsername();

            var authToken = new UsernamePasswordAuthenticationToken(
                    principal, null, List.of(new SimpleGrantedAuthority(autoridad)));
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authToken);
        });

        filterChain.doFilter(request, response);
    }

    private Optional<Usuario> buscarUsuario(String identificador) {
        Optional<Usuario> usuario = usuarioRepository.findByUsername(identificador);
        if (usuario.isPresent()) {
            return usuario;
        }
        return usuarioRepository.findByUsername(identificador.toLowerCase().trim());
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String ruta = request.getServletPath();
        return ruta.startsWith("/api/v1/auth/")
                || ruta.startsWith("/ws-tickets")
                || ruta.equals("/api/salud")
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }
}