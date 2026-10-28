import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import InventoryIcon from '@mui/icons-material/Inventory';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import TvIcon from '@mui/icons-material/Tv';

import { AuthContext } from '../context/AuthContext';
import PieDePagina from './PieDePagina';
import api from '../api/axiosClient';
import { useFeedback } from './FeedbackProvider';

const drawerWidth = 260;

// Rutas del panel permitidas al cajero (el resto se bloquea por URL y se redirige).
const RUTAS_CAJERO = ['/dashboard/ventas', '/dashboard/caja', '/dashboard/utensilios', '/dashboard/deudores'];

export default function MainLayout() {
  const { logout } = useContext(AuthContext);
  const { notificar } = useFeedback();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);   // drawer temporal (móvil)
  const [desktopOpen, setDesktopOpen] = useState(true);  // barra lateral visible en escritorio
  const [openLogout, setOpenLogout] = useState(false);   // confirmación de cerrar sesión
  const navigate = useNavigate();
  const location = useLocation();

  // Rol del usuario en sesion (para mostrar el menu segun su perfil).
  const rolUsuario = (() => {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').rol || '').toUpperCase(); }
    catch { return ''; }
  })();
  const esAdmin = rolUsuario.includes('ADMIN');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // El cajero solo puede entrar a sus pantallas; cualquier otra ruta del panel
  // (incluido el Dashboard al iniciar) lo manda al Punto de Venta. Se decide en el
  // render (no en un efecto) para que la página prohibida ni siquiera se monte:
  // si se montara, alcanzaría a pedir sus datos y el backend respondería 403.
  const rutaPermitida = esAdmin || RUTAS_CAJERO.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`)
  );

  // Aviso de stock bajo al iniciar sesión (una sola vez por sesión).
  // El stock bajo es un ESTADO persistente: el detalle vive en el Dashboard;
  // aquí solo recordamos al entrar que hay insumos por reabastecer.
  useEffect(() => {
    if (sessionStorage.getItem('stockAvisado')) return;
    let activo = true;
    (async () => {
      try {
        const res = await api.get('/dashboard/resumen', { params: { dias: 1 } });
        const n = Number(res.data?.kpis?.insumosBajoMinimo) || 0;
        if (activo && n > 0) {
          notificar(`Hay ${n} insumo${n === 1 ? '' : 's'} por reabastecer. Revísalos en el Dashboard.`, 'warning');
        }
      } catch {
        /* silencioso: si el resumen no está disponible, no molestamos al usuario */
      } finally {
        sessionStorage.setItem('stockAvisado', '1');
      }
    })();
    return () => { activo = false; };
  }, [notificar]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // El botón de menú oculta/muestra la barra: en escritorio colapsa la fija,
  // en móvil abre/cierra el panel deslizante.
  const handleMenuToggle = () => {
    if (isDesktop) setDesktopOpen((o) => !o);
    else setMobileOpen((o) => !o);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('stockAvisado'); // para que el aviso de stock vuelva a salir en el próximo inicio de sesión
    logout();
    navigate('/login', { replace: true });
  };

  // cajero: true -> la opcion también se muestra al cajero. El admin ve todo.
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Categorías', icon: <CategoryIcon />, path: '/dashboard/categorias' },
    { text: 'Menú de Cafetería', icon: <RestaurantMenuIcon />, path: '/dashboard/menu' },
    { text: 'Punto de Venta', icon: <PointOfSaleIcon />, path: '/dashboard/ventas', cajero: true },
    { text: 'Caja y Turnos', icon: <AccountBalanceWalletIcon />, path: '/dashboard/caja', cajero: true },
    { text: 'Historial de Ventas', icon: <ReceiptLongIcon />, path: '/dashboard/historial-ventas' },
    { text: 'Inventario (Prod. Terminados)', icon: <InventoryIcon />, path: '/dashboard/inventario' },
    { text: 'Recolección de cubiertos', icon: <RestaurantIcon />, path: '/dashboard/utensilios', cajero: true },
    { text: 'Recetas', icon: <RestaurantMenuIcon />, path: '/dashboard/recetas' },
    { text: 'Personal', icon: <GroupIcon />, path: '/dashboard/usuarios' },
    { text: 'Créditos y abonos', icon: <MoneyOffIcon />, path: '/dashboard/deudores', cajero: true },
    { text: 'Clientes', icon: <PeopleIcon />, path: '/dashboard/clientes' },
    { text: 'Pantalla del menú (TV)', icon: <TvIcon />, path: '/pantalla-menu', nuevaPestana: true, cajero: true },
  ].filter((item) => esAdmin || item.cajero);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
      <Toolbar sx={{ px: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '0.5px' }}>
          SEDIF Cafetería
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: '#f1f5f9' }} />
      <List sx={{ px: 2, mt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => item.nuevaPestana ? window.open(item.path, '_blank') : navigate(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: '10px',
                  py: 1.2,
                  backgroundColor: isActive ? '#fdf2f4' : 'transparent',
                  color: isActive ? '#fc6c9c' : '#475569',
                  '&.Mui-selected': {
                    backgroundColor: '#fdf2f4',
                    color: 'primary.main',
                    '&:hover': { backgroundColor: '#fce7eb' },
                  },
                  '&:hover': { backgroundColor: '#f8fafc', color: '#1e293b' },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#fc6c9c' : '#94a3b8', minWidth: '40px' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  slotProps={{ primary: { fontSize: '0.9rem', fontWeight: isActive ? 600 : 500 } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { sm: desktopOpen ? `${drawerWidth}px` : 0 },
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderBottom: '1px solid #e2e8f0',
          transition: theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.shorter }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="mostrar u ocultar menú"
              edge="start"
              onClick={handleMenuToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1.1rem' }}>
              Panel de Operaciones
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              onClick={() => setOpenLogout(true)}
              variant="text"
              startIcon={<LogoutIcon />}
              sx={{
                color: '#dc2626',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                borderRadius: '8px',
                padding: '6px 12px',
                '&:hover': {
                  backgroundColor: '#fef2f2',
                },
              }}
            >
              Cerrar sesión
            </Button>
            
            <Avatar sx={{ width: 38, height: 38, backgroundColor: 'primary.main', fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(252, 108, 156, 0.3)' }}>
              <AccountCircleIcon />
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: desktopOpen ? drawerWidth : 0 },
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open={desktopOpen}
          sx={{
            display: { xs: 'none', sm: desktopOpen ? 'block' : 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #e2e8f0' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          mt: '64px',
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          backgroundColor: '#f8fafc',
          minHeight: 'calc(100vh - 64px)',
          boxSizing: 'border-box',
          overflowX: 'hidden', // CLAVE: Evita que las gráficas rompan el contenedor
          // Columna flex: el bloque de contenido crece y empuja el pie de página
          // al fondo, que al ser hermano directo abarca todo el ancho sin padding.
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Bloque con el padding generoso. El pie de página queda FUERA de este
            bloque para poder llegar de borde a borde y pegarse al fondo. */}
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 3, sm: 4, md: 5 },
            pb: { xs: 4, sm: 6 },
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Contenedor que centra y limita el ancho en pantallas grandes. */}
          <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
            {rutaPermitida ? <Outlet /> : <Navigate to="/dashboard/ventas" replace />}
          </Box>
        </Box>

        {/* Pie de página común a todas las vistas (barra inferior a todo lo ancho) */}
        <PieDePagina />
      </Box>

      {/* Confirmación de cerrar sesión */}
      <Dialog open={openLogout} onClose={() => setOpenLogout(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Cerrar sesión</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary' }}>
            ¿Seguro que deseas cerrar sesión?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" color="error" onClick={() => setOpenLogout(false)}>Cancelar</Button>
          <Button variant="contained" color="success" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}