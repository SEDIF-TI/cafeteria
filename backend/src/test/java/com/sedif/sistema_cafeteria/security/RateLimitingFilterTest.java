package com.sedif.sistema_cafeteria.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.ForwardedHeaderFilter;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Reproduce la cadena de produccion: el nginx del frontend (siempre la misma IP)
 * reenvia a cada usuario con su IP en X-Forwarded-For, y el ForwardedHeaderFilter
 * de Spring corre antes que el limitador.
 */
class RateLimitingFilterTest {

    private static final String IP_NGINX = "172.18.0.5";

    private final RateLimitingFilter limitador = new RateLimitingFilter(true, 5, 1);

    private int intentarLogin(String ipUsuario) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/acceso");
        request.setServletPath("/api/v1/auth/acceso");
        request.setRemoteAddr(IP_NGINX);
        request.addHeader("X-Forwarded-For", ipUsuario);
        MockHttpServletResponse response = new MockHttpServletResponse();
        jakarta.servlet.http.HttpServlet controlador = new jakarta.servlet.http.HttpServlet() {
            @Override
            protected void service(jakarta.servlet.http.HttpServletRequest req,
                                   jakarta.servlet.http.HttpServletResponse res) {
                res.setStatus(200);
            }
        };
        new MockFilterChain(controlador, new ForwardedHeaderFilter(), limitador).doFilter(request, response);
        return response.getStatus();
    }

    @Test
    void usuariosDistintosNoCompartenElLimite() throws Exception {
        for (int i = 1; i <= 8; i++) {
            assertEquals(200, intentarLogin("10.10.20." + i), "usuario " + i + " no debe ser bloqueado");
        }
    }

    @Test
    void unMismoUsuarioSeBloqueaAlSextoIntento() throws Exception {
        for (int i = 1; i <= 5; i++) {
            assertEquals(200, intentarLogin("10.10.20.50"));
        }
        assertEquals(429, intentarLogin("10.10.20.50"));
    }
}
