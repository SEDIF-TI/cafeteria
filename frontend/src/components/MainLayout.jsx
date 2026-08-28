import { useContext, useEffect, useState, useMemo } from 'react';
import {
    Box, Drawer, AppBar, Toolbar, List, Typography, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Button, Tooltip, IconButton, Alert, AlertTitle,
    useMediaQuery, Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext.jsx';
import { useWebSocket } from '../context/useWebSocket.js';
import { avisoService } from '../services/avisoService';
import { perfilService } from '../services/perfilService';
import { useNetworkStatus } from '../hooks/useNetworkStatus.jsx';
import { useRol } from '../hooks/useRol.jsx';

import PieDePagina from './PieDePagina.jsx';

import logoPuebla from '../assets/logo-puebla.png';

// Iconos
import MenuIcon from '@mui/icons-material/Menu';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import HistoryIcon from '@mui/icons-material/History';
import DomainIcon from '@mui/icons-material/Domain';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CampaignIcon from '@mui/icons-material/Campaign';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import ComputerIcon from '@mui/icons-material/Computer';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import MailIcon from '@mui/icons-material/Mail';

/** Ancho del menú lateral en escritorio (solo iconos). */
const ANCHO_MENU = 72;

/** Ancho del cajón en móvil, donde sí caben las etiquetas. */
const ANCHO_MENU_MOVIL = 268;

/** Alto de la barra superior, que aloja el logotipo institucional. */
const ALTO_BARRA = { xs: 56, sm: 68 };

/**
 * Alto del logotipo: deliberadamente cercano al de la barra, con 4px de margen
 * por lado. Es el respiro mínimo para que no se lea como recortado sin dejar
 * franjas vacías arriba y abajo.
 */
const ALTO_LOGO = { xs: 48, sm: 60 };

/**
 * Traduce el nombre de icono guardado en la tabla `vista` a su componente.
 * El menú se construye desde la base de datos, así que este mapa es el punto
 * de unión entre esa configuración y la interfaz. Una vista con un icono que no
 * figure aquí se dibuja con el genérico.
 */
const ICONOS = {
    DashboardIcon,
    GroupIcon,
    HistoryIcon,
    DomainIcon,
    AddCircleIcon,
    CampaignIcon,
    AssignmentIcon,
    DescriptionIcon,
    ComputerIcon,
    InventoryIcon,
    HomeRepairServiceIcon,
    MailIcon,
};

/**
 * Estructura principal de la aplicación: barra superior con el logotipo y la
 * identidad del usuario, menú lateral y área de contenido.
 *
 * El menú no está escrito aquí: se construye con las vistas que el servidor
 * autoriza al usuario, y se refresca al montar para no arrastrar el que quedó
 * guardado al iniciar sesión. Solo se dibuja si hay sesión, la contraseña ya no
 * es temporal y hay al menos una vista: mientras el cambio de contraseña sigue
 * pendiente no hay navegación posible a ningún sitio.
 *
 * En escritorio el menú es un cajón permanente y estrecho, de solo iconos; en
 * móvil pasa a ser temporal y se superpone al contenido, para no robarle ancho
 * a una pantalla que no lo tiene.
 *
 * Sobre el contenido se apilan dos clases de aviso: el estado de la conexión,
 * que sale de `useNetworkStatus`, y los avisos institucionales, que combinan un
 * sondeo periódico con las alertas de resguardo vencido que llegan por STOMP.
 */
export default function MainLayout({ children }) {
    const { user, logout, actualizarVistas } = useContext(AuthContext);
    const { stompClient, isConnected } = useWebSocket();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const esEscritorio = useMediaQuery(theme.breakpoints.up('md'));

    const [menuAbierto, setMenuAbierto] = useState(false);
    const [avisos, setAvisos] = useState([]);
    const [avisosOcultos, setAvisosOcultos] = useState([]);
    const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
    const [estuvoSinConexion, setEstuvoSinConexion] = useState(false);

    const estadoRed = useNetworkStatus();
    const sinConexion = Boolean(estadoRed.sinConexion ?? estadoRed);

    const { rol, esAdministrador, esEmpleado } = useRol();
    const bloqueadoPorPassword = Boolean(user?.passwordTemporal);

    const vistas = useMemo(() => user?.vistasPermitidas ?? [], [user]);
    const mostrarMenu = Boolean(user) && !bloqueadoPorPassword && vistas.length > 0;

    // Aviso de conectividad. Los dos cortes posibles piden acciones distintas,
    // así que se distinguen en lugar de mostrar un texto único:
    //
    //  - Sin red en el equipo: el resto de la institución sigue trabajando, de
    //    modo que la vía para pedir ayuda es que otra persona levante el
    //    ticket. A soporte se le indica la revisión que le corresponde hacer.
    //  - Servidor caído: no hay nada que el usuario pueda hacer desde aquí, y
    //    lo importante es que sepa que lo que ve en pantalla puede no estar al
    //    día y que no pierda lo que estaba capturando.
    const mensajeDeConexion = useMemo(() => {
        if (estadoRed.servidorCaido) {
            return {
                titulo: 'Sin comunicación con el servidor',
                detalle: 'Tu equipo tiene internet, pero el sistema no responde. '
                    + 'Los datos en pantalla pueden estar desactualizados y no se guardará '
                    + 'nada de lo que captures. Espera unos minutos y vuelve a intentarlo; '
                    + 'si continúa, avisa al área de soporte técnico.',
            };
        }

        return {
            titulo: 'Sin conexión a internet',
            detalle: esEmpleado
                ? 'Espera a que se restablezca para continuar. Si es el único equipo sin '
                  + 'internet y necesitas reportar una falla, pide a un compañero que levante '
                  + 'el ticket por ti para que puedan apoyarte.'
                : 'Espera a que se restablezca para continuar. Si el corte es solo de este '
                  + 'equipo, revisa el cable de red o la conexión al wifi antes de reportarlo.',
        };
    }, [estadoRed.servidorCaido, esEmpleado]);

    // El aviso de "conexión restablecida" solo tiene sentido si antes se perdió,
    // de ahí el rastro en `estuvoSinConexion`. Se retira solo a los 5 segundos:
    // es una confirmación, no un estado que haya que atender.
    useEffect(() => {
        if (sinConexion) {
            setEstuvoSinConexion(true);
            setMostrarRecuperacion(false);
        } else if (estuvoSinConexion) {
            setMostrarRecuperacion(true);
            setEstuvoSinConexion(false);
            const temporizador = setTimeout(() => setMostrarRecuperacion(false), 5000);
            return () => clearTimeout(temporizador);
        }
    }, [sinConexion, estuvoSinConexion]);

    // El menú viaja en la respuesta del login y queda guardado en el navegador.
    // Se vuelve a pedir al montar para que una vista retirada deje de dibujarse
    // y una recién concedida aparezca, sin necesidad de cerrar sesión.
    useEffect(() => {
        if (!user || bloqueadoPorPassword) return;

        let cancelado = false;

        perfilService.getVistas()
            .then((respuesta) => {
                if (!cancelado && Array.isArray(respuesta?.data)) {
                    actualizarVistas(respuesta.data);
                }
            })
            .catch(() => {
                // Sin respuesta se conserva el menú guardado: es preferible uno
                // desactualizado a dejar al usuario sin navegación.
            });

        return () => { cancelado = true; };
        // Se depende del identificador del usuario y no del objeto: la propia
        // `actualizarVistas` lo sustituye, así que incluirla —o incluir `user`—
        // encadenaría el efecto consigo mismo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.usuarioId, bloqueadoPorPassword]);

    // Avisos institucionales: se consultan al entrar y cada 30 segundos. Se
    // filtran a los activos dirigidos al área del usuario o a toda la
    // institución; administración los ve todos.
    useEffect(() => {
        if (!user || bloqueadoPorPassword) return;

        const buscarAvisos = async () => {
            // Sin conexión no se insiste: solo llenaría la consola de errores.
            if (sinConexion) return;

            try {
                const respuesta = await avisoService.getActivos();
                const datos = Array.isArray(respuesta.data) ? respuesta.data : [];

                setAvisos(
                    datos.filter((a) => {
                        const activo = a.activo === true;
                        const esParaMi =
                            !a.areaId || a.areaId === user?.areaId || esAdministrador;
                        return activo && esParaMi;
                    })
                );
            } catch {
                // El fallo ya se refleja en el indicador de conexión.
                setAvisos([]);
            }
        };

        buscarAvisos();
        const intervalo = setInterval(buscarAvisos, 30000);
        return () => clearInterval(intervalo);
    }, [user, bloqueadoPorPassword, esAdministrador, sinConexion]);

    // Alertas de resguardo vencido por STOMP. Se añaden a la misma lista de
    // avisos, con un identificador que incluye la marca de tiempo para que dos
    // alertas del mismo resguardo no compartan clave de React.
    useEffect(() => {
        if (!stompClient || !isConnected || !user || bloqueadoPorPassword) return;

        const suscripcion = stompClient.subscribe('/topic/alertas-resguardos', (mensaje) => {
            try {
                const resguardo = JSON.parse(mensaje.body);
                setAvisos((prev) => [
                    {
                        id: `resguardo-${resguardo.id}-${Date.now()}`,
                        titulo: 'Resguardo vencido',
                        mensaje: `El resguardo de ${resguardo.solicitanteNombre} (${resguardo.equipoNombre}) ha vencido.`,
                        severidad: 'error',
                    },
                    ...prev,
                ]);
            } catch {
                // Un mensaje mal formado no debe tumbar la suscripción.
            }
        });

        return () => suscripcion?.unsubscribe();
    }, [stompClient, isConnected, user, bloqueadoPorPassword]);

    const avisosVisibles = avisos.filter((a) => !avisosOcultos.includes(a.id));

    const cerrarSesion = () => {
        logout();
        navigate('/login');
    };

    // En móvil el cajón se cierra al navegar; en escritorio es permanente y no
    // hay nada que cerrar.
    const irA = (ruta) => {
        navigate(ruta);
        if (!esEscritorio) setMenuAbierto(false);
    };

    const contenidoMenu = (
        <>
            {/* Toolbar vacía que reserva el alto de la barra superior: sin ella
                la primera opción del menú quedaría oculta debajo. */}
            <Toolbar sx={{ minHeight: ALTO_BARRA }} />
            <List component="nav" aria-label="Navegación principal" sx={{ px: 1, pt: 2 }}>
                {vistas.map((vista) => {
                    const Icono = ICONOS[vista.icono] || DescriptionIcon;
                    const activa = location.pathname === vista.ruta;

                    return (
                        <ListItem key={vista.ruta} disablePadding sx={{ mb: 0.5 }}>
                            <Tooltip title={esEscritorio ? vista.nombre : ''} placement="right" arrow>
                                <ListItemButton
                                    onClick={() => irA(vista.ruta)}
                                    selected={activa}
                                    // El tooltip no aporta nombre accesible, y
                                    // en escritorio el botón es solo un icono:
                                    // sin esto un lector de pantalla anunciaría
                                    // "botón" en cada opción del menú.
                                    aria-label={vista.nombre}
                                    aria-current={activa ? 'page' : undefined}
                                    sx={{
                                        minHeight: 48,
                                        justifyContent: esEscritorio ? 'center' : 'flex-start',
                                        px: esEscritorio ? 1 : 2,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: esEscritorio ? 0 : 40,
                                            justifyContent: 'center',
                                            color: activa ? 'primary.main' : 'text.secondary',
                                        }}
                                    >
                                        <Icono />
                                    </ListItemIcon>
                                    {/* La etiqueta solo se muestra en el cajón
                                        móvil, donde hay espacio de sobra. */}
                                    {!esEscritorio && (
                                        <ListItemText
                                            primary={vista.nombre}
                                            primaryTypographyProps={{
                                                fontWeight: activa ? 600 : 500,
                                                color: activa ? 'primary.main' : 'text.primary',
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    );
                })}
            </List>
        </>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <a href="#contenido-principal" className="skip-link">
                Saltar al contenido principal
            </a>

            {/* La barra se sitúa por encima del cajón en el eje z para que el
                logotipo no quede partido por el borde del menú. */}
            <AppBar
                position="fixed"
                sx={{ bgcolor: 'primary.main', zIndex: (t) => t.zIndex.drawer + 1 }}
            >
                <Toolbar sx={{ minHeight: ALTO_BARRA, gap: 1, px: { xs: 1, sm: 3 }, position: 'relative' }}>
                    {mostrarMenu && !esEscritorio && (
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={() => setMenuAbierto(true)}
                            aria-label="Abrir menú de navegación"
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    {/* Logotipo institucional.

                        En escritorio se centra respecto a la BARRA y no
                        respecto al espacio libre, de ahí la posición absoluta:
                        dentro del flujo, los bloques de los lados tienen anchos
                        distintos —el botón de la izquierda solo existe en
                        móvil— y el centro se desplazaría con ellos.

                        `pointerEvents: none` deja pasar el clic a los botones
                        que quedan bajo esta caja, que ocupa el ancho completo
                        sin ser interactiva. */}
                    <Box
                        sx={{
                            position: { xs: 'static', md: 'absolute' },
                            left: { md: '50%' },
                            transform: { md: 'translateX(-50%)' },
                            flex: { xs: 1, md: 'unset' },
                            display: 'flex',
                            justifyContent: { xs: 'flex-start', md: 'center' },
                            alignItems: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <Box
                            component="img"
                            src={logoPuebla}
                            alt="Gobierno del Estado de Puebla"
                            sx={{
                                height: ALTO_LOGO,
                                width: 'auto',
                                objectFit: 'contain',
                                // El logotipo es oscuro; sobre el guinda se
                                // invierte a blanco para que se lea.
                                filter: 'brightness(0) invert(1)',
                            }}
                        />
                    </Box>

                    {/* Relleno que empuja la identidad del usuario al extremo
                        derecho, ya que en escritorio el logotipo no ocupa
                        sitio en el flujo. */}
                    <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />

                    {/* Identidad del usuario y acciones. Salir aparece como
                        botón con texto donde cabe y como icono en pantallas
                        estrechas. */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                        <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right', mr: 1 }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.3, fontWeight: 500 }}>
                                {user?.nombre || 'Usuario'}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                {rol}
                            </Typography>
                        </Box>

                        {!bloqueadoPorPassword && (
                            <Tooltip title="Mi perfil">
                                <IconButton
                                    color="inherit"
                                    onClick={() => navigate('/perfil')}
                                    aria-label="Ir a mi perfil"
                                >
                                    <AccountCircleIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        <Button
                            color="inherit"
                            onClick={cerrarSesion}
                            startIcon={<ExitToAppIcon />}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                            Salir
                        </Button>

                        <Tooltip title="Cerrar sesión">
                            <IconButton
                                color="inherit"
                                onClick={cerrarSesion}
                                aria-label="Cerrar sesión"
                                sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                            >
                                <ExitToAppIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Escritorio: cajón permanente y estrecho, que sí reserva su ancho
                en el flujo. Móvil: cajón temporal superpuesto, que no lo
                reserva. `keepMounted` conserva el contenido montado para que
                abrirlo en móvil sea inmediato. */}
            {mostrarMenu && (
                <Box component="nav" sx={{ width: { md: ANCHO_MENU }, flexShrink: { md: 0 } }}>
                    <Drawer
                        variant={esEscritorio ? 'permanent' : 'temporary'}
                        open={esEscritorio ? true : menuAbierto}
                        onClose={() => setMenuAbierto(false)}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            '& .MuiDrawer-paper': {
                                width: esEscritorio ? ANCHO_MENU : ANCHO_MENU_MOVIL,
                                boxSizing: 'border-box',
                                bgcolor: 'background.paper',
                                borderRight: '1px solid',
                                borderColor: 'divider',
                            },
                        }}
                    >
                        {contenidoMenu}
                    </Drawer>
                </Box>
            )}

            {/* `minWidth: 0` permite que una tabla ancha genere su propio scroll
                interno en lugar de estirar toda la página: sin él, un hijo
                flexible se niega a encogerse por debajo de su contenido. */}
            <Box
                component="main"
                id="contenido-principal"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    // Columna con alto mínimo de pantalla: es lo que permite al
                    // pie bajar al fondo con `mt: auto` cuando el contenido es
                    // corto, sin recurrir a `position`.
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    p: { xs: 2, sm: 3 },
                    // El hueco de la barra fija se reserva en píxeles y no con
                    // el número suelto: `mt` interpreta los números como
                    // múltiplos del espaciado del tema (8px), de modo que un
                    // `mt: 72` reservaría 576px en lugar de 72.
                    mt: { xs: `${ALTO_BARRA.xs}px`, sm: `${ALTO_BARRA.sm}px` },
                }}
            >
                {/* Estado de la conexión. `aria-live` hace que un lector de
                    pantalla lo anuncie sin que el usuario tenga que buscarlo. */}
                <Box aria-live="polite">
                    <Collapse in={sinConexion}>
                        <Alert severity="error" icon={<WifiOffIcon />} sx={{ mb: 2 }}>
                            <AlertTitle>{mensajeDeConexion.titulo}</AlertTitle>
                            {mensajeDeConexion.detalle}
                        </Alert>
                    </Collapse>

                    <Collapse in={mostrarRecuperacion}>
                        <Alert
                            severity="success"
                            icon={<CheckCircleIcon />}
                            onClose={() => setMostrarRecuperacion(false)}
                            sx={{ mb: 2 }}
                        >
                            <AlertTitle>Conexión restablecida</AlertTitle>
                            Ya puedes continuar. Si algo quedó a medias, vuelve a intentarlo.
                        </Alert>
                    </Collapse>
                </Box>

                {/* Los avisos van en línea y no flotando sobre el contenido,
                    que quedaría tapado. La severidad se usa en su variante
                    estándar y no `filled`, cuyo fondo en warning no alcanza el
                    contraste mínimo legible. */}
                {avisosVisibles.length > 0 && (
                    <Box
                        aria-live="polite"
                        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}
                    >
                        {avisosVisibles.map((aviso) => (
                            <Alert
                                key={aviso.id}
                                severity={aviso.severidad || 'warning'}
                                onClose={() => setAvisosOcultos((prev) => [...prev, aviso.id])}
                                className="fade-in-up"
                            >
                                <Box component="strong" sx={{ fontWeight: 600 }}>
                                    {aviso.titulo}
                                </Box>
                                {aviso.mensaje ? `: ${aviso.mensaje}` : ''}
                            </Alert>
                        ))}
                    </Box>
                )}

                {/* El contenido crece para ocupar el hueco disponible, de modo
                    que el pie quede abajo aunque la pantalla tenga poco que
                    mostrar. */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {children}
                </Box>

                <PieDePagina />
            </Box>
        </Box>
    );
}