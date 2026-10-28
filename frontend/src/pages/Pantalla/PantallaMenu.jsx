import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import api from '../../api/axiosClient';

/**
 * Pantalla del "Menú del día" pensada para proyectarse en un televisor por HDMI.
 *
 * - Muestra solo los platillos ACTIVOS y con precio (los que están a la venta hoy).
 * - Se actualiza sola cada 10 s, así que al activar/desactivar un producto en el
 *   Menú, el televisor se refleja sin que nadie toque la pantalla.
 * - Botón "Pantalla completa" (se oculta al entrar en pantalla completa) para
 *   dejarla como letrero limpio.
 */
export default function PantallaMenu() {
  const [productos, setProductos] = useState([]);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/productos');
      const activos = (res.data || []).filter((p) => p.activo !== false && Number(p.precio) > 0);
      setProductos(activos);
    } catch {
      /* silencioso: si falla una actualización, se mantiene lo último mostrado */
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 10000); // refresco automático cada 10 s
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    const onFs = () => setEnPantallaCompleta(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const porCategoria = useMemo(() => {
    const mapa = {};
    productos.forEach((p) => {
      const cat = p.categoria?.nombre || 'General';
      (mapa[cat] = mapa[cat] || []).push(p);
    });
    return Object.keys(mapa)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      .map((categoria) => ({
        categoria,
        items: mapa[categoria].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }))
      }));
  }, [productos]);

  const alternarPantallaCompleta = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff', color: '#1e293b', p: { xs: 2, md: 5 } }}>
      {/* Encabezado */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: '5px solid', borderColor: 'primary.main', pb: 2, mb: 4, gap: 2, flexWrap: 'wrap'
      }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '2.2rem', md: '3.4rem' }, fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>
            Menú del día
          </Typography>
          <Typography sx={{ fontSize: { xs: '1rem', md: '1.5rem' }, color: '#64748b', textTransform: 'capitalize', mt: 0.5 }}>
            {hoy} · SEDIF Cafetería
          </Typography>
        </Box>
        {!enPantallaCompleta && (
          <Button
            variant="contained"
            size="large"
            startIcon={<FullscreenIcon />}
            onClick={alternarPantallaCompleta}
            sx={{ backgroundColor: 'primary.main', fontWeight: 'bold' }}
          >
            Pantalla completa
          </Button>
        )}
        {enPantallaCompleta && (
          <Button
            variant="text"
            startIcon={<FullscreenExitIcon />}
            onClick={alternarPantallaCompleta}
            sx={{ color: 'primary.main', opacity: 0.4, '&:hover': { opacity: 1 } }}
          >
            Salir
          </Button>
        )}
      </Box>

      {/* Columnas de categorías (se reacomodan según el ancho del televisor) */}
      <Box sx={{ columnCount: { xs: 1, sm: 2, lg: 3 }, columnGap: 5 }}>
        {porCategoria.map(({ categoria, items }) => (
          <Box key={categoria} sx={{ breakInside: 'avoid', mb: 4 }}>
            <Typography sx={{
              fontSize: { xs: '1.4rem', md: '2rem' }, fontWeight: 800, color: 'primary.main',
              borderBottom: '2px dashed', borderColor: 'primary.light', pb: 0.5, mb: 1
            }}>
              {categoria}
            </Typography>
            {items.map((p) => (
              <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, py: 0.75 }}>
                <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' }, fontWeight: 600 }}>{p.nombre}</Typography>
                <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' }, fontWeight: 900, color: '#2e7d32', whiteSpace: 'nowrap' }}>
                  ${Number(p.precio).toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
        {productos.length === 0 && (
          <Typography sx={{ fontSize: '1.5rem', color: '#64748b' }}>
            No hay platillos disponibles por ahora.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
