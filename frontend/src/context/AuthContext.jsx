import { createContext, useState, useEffect } from 'react';

/**
 * Sesión del usuario.
 *
 * Expone `{ user, login, logout, loading, marcarPasswordCambiada,
 * actualizarVistas }`. `user` guarda lo que devolvió el login —token, rol,
 * área, vistas del menú y el indicador de contraseña temporal— y se replica en
 * localStorage bajo la clave `user`, que es de donde lo lee el interceptor de
 * api.js para firmar cada petición y de donde se recupera al recargar la
 * página.
 *
 * `loading` cubre esa recuperación inicial: mientras vale `true` todavía no se
 * sabe si hay sesión, así que las rutas protegidas deben esperar en lugar de
 * dar por hecho que no la hay y redirigir al login.
 */
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Rescata la sesión guardada al montar la aplicación.
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        setLoading(false);
    }, []);

    const login = async (identificador, password) => {
        const response = await api.post('/v1/auth/login', { identificador, password });
        const userData = response.data; 
        
        // El backend envía el menú en `vistas`; el resto de la aplicación lo
        // consulta como `vistasPermitidas`.
        userData.vistasPermitidas = userData.vistas || [];

        // El indicador de contraseña temporal viaja como campo propio de la
        // respuesta, así que no hace falta decodificar el JWT para conocerlo.
        userData.passwordTemporal = userData.passwordTemporal || false;

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    /**
     * Sustituye el menú guardado por el que el servidor considera vigente.
     *
     * Lo llama MainLayout al montarse. Como el menú se copia en localStorage al
     * iniciar sesión, sin este refresco una vista retirada seguiría dibujándose
     * —y un permiso recién concedido no aparecería— hasta volver a entrar.
     */
    const actualizarVistas = (vistas) => {
        setUser((actual) => {
            if (!actual) return actual;
            const actualizado = { ...actual, vistasPermitidas: vistas ?? [] };
            localStorage.setItem('user', JSON.stringify(actualizado));
            return actualizado;
        });
    };

    /**
     * Levanta el bloqueo por contraseña temporal una vez cambiada, sin obligar
     * a cerrar sesión y volver a entrar para que el menú reaparezca.
     */
    const marcarPasswordCambiada = () => {
        if (user) {
            const usuarioActualizado = { ...user, passwordTemporal: false };
            localStorage.setItem('user', JSON.stringify(usuarioActualizado));
            setUser(usuarioActualizado);
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, marcarPasswordCambiada, actualizarVistas }}>
            {children}
        </AuthContext.Provider>
    );
};