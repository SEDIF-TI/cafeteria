import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, CircularProgress, ToggleButtonGroup, ToggleButton, Alert, LinearProgress
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../../api/axiosClient';

// Paleta categórica validada (orden fijo, nunca ciclado) y colores de estado reservados
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const PRINCIPAL = SERIES[0];
const ESTADO = { bueno: '#0ca30c', alerta: '#fab219', critico: '#d03b3b' };
const GRID = '#e6e5e0';
const TINTA_SEC = '#52514e';

const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dineroCorto = (v) => {
  const n = Number(v || 0);
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
};
const fechaCorta = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const ejeProps = { tick: { fontSize: 12, fill: TINTA_SEC }, axisLine: { stroke: GRID }, tickLine: false };

function Kpi({ titulo, valor, detalle, color, tendencia }) {
  return (
    <Card elevation={1} sx={{ borderLeft: `4px solid ${color || PRINCIPAL}`, height: '100%' }}>
      <CardContent sx={{ py: 2 }}>
        <Typography color="text.secondary" variant="caption" textTransform="uppercase" fontWeight="bold">
          {titulo}
        </Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{valor}</Typography>
        {detalle && (
          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
            {tendencia === 'up' && <TrendingUpIcon fontSize="small" sx={{ color: ESTADO.bueno }} />}
            {tendencia === 'down' && <TrendingDownIcon fontSize="small" sx={{ color: ESTADO.critico }} />}
            <Typography variant="body2" color="text.secondary">{detalle}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function Panel({ titulo, subtitulo, children, alto = 320 }) {
  return (
    <Paper elevation={1} sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" fontWeight="bold">{titulo}</Typography>
      {subtitulo && <Typography variant="body2" color="text.secondary" mb={1}>{subtitulo}</Typography>}
      <Box sx={{ width: '100%', height: alto }}>{children}</Box>
    </Paper>
  );
}

function SinDatos() {
  return (
    <Box height="100%" display="flex" alignItems="center" justifyContent="center">
      <Typography variant="body2" color="text.secondary">Sin datos en el periodo</Typography>
    </Box>
  );
}

/** Barras horizontales de una sola serie: ranking de nombres largos legible en móvil. */
function BarrasRanking({ datos, campo = 'valor', formato = dinero, color = PRINCIPAL, nombreSerie }) {
  if (!datos?.length) return <SinDatos />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" {...ejeProps} tickFormatter={formato === dinero ? dineroCorto : undefined} />
        <YAxis type="category" dataKey="nombre" width={130} {...ejeProps} />
        <Tooltip formatter={(v) => [formato(v), nombreSerie]} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey={campo} fill={color} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const grid = (cols) => ({
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(cols, 2)}, 1fr)`, lg: `repeat(${cols}, 1fr)` },
  gap: 2.5,
  mb: 3
});

export default function Dashboard() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await api.get('/dashboard/resumen', { params: { dias } });
        setDatos(res.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo cargar el dashboard.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [dias]);

  if (cargando && !datos) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!datos) {
    return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  }

  const k = datos.kpis;
  const anterior = Number(k.ingresosPeriodoAnterior);
  const variacion = anterior > 0 ? ((Number(k.ingresosPeriodo) - anterior) / anterior) * 100 : null;
  const textoVariacion = variacion === null
    ? 'Sin periodo previo para comparar'
    : `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}% vs. ${dias} días anteriores`;
  const serie = datos.ventasPorDia.map((d) => ({ ...d, etiqueta: fechaCorta(d.fecha) }));
  const metodosPago = datos.metodosPago.slice(0, 7);

  return (
    <Box sx={{ width: '100%', p: { xs: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Panel Principal</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Indicadores de ventas, crédito, inventario y cubiertos para la toma de decisiones.
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={dias} onChange={(_, v) => v && setDias(v)}>
          <ToggleButton value={7}>7 días</ToggleButton>
          <ToggleButton value={30}>30 días</ToggleButton>
          <ToggleButton value={90}>90 días</ToggleButton>
          <ToggleButton value={365}>1 año</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {cargando && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ---------------- KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Kpi titulo={`Ingresos (${dias} días)`} valor={dinero(k.ingresosPeriodo)} detalle={textoVariacion}
             tendencia={variacion === null ? null : variacion >= 0 ? 'up' : 'down'} />
        <Kpi titulo="Hoy" valor={dinero(k.ingresosHoy)} detalle={`${k.ventasHoy} ventas`} />
        <Kpi titulo="Ticket promedio" valor={dinero(k.ticketPromedio)} detalle={`${k.ventasPeriodo} ventas en el periodo`} />
        <Kpi titulo="Utilidad estimada" valor={dinero(k.utilidadEstimada)} detalle={`Margen ${k.margenPorcentaje}% (precio − costo)`} />
        <Kpi titulo="Crédito por cobrar" valor={dinero(k.deudaPendiente)} detalle={`${k.clientesConDeuda} clientes con adeudo`}
             color={Number(k.deudaPendiente) > 0 ? ESTADO.alerta : ESTADO.bueno} />
        <Kpi titulo="Insumos bajo mínimo" valor={k.insumosBajoMinimo} detalle="Requieren reabastecimiento"
             color={k.insumosBajoMinimo > 0 ? ESTADO.critico : ESTADO.bueno} />
        <Kpi titulo="Cubiertos fuera" valor={k.cubiertosFuera} detalle={`${k.prestamosAbiertos} préstamos abiertos`}
             color={k.cubiertosFuera > 0 ? ESTADO.alerta : ESTADO.bueno} />
        <Kpi titulo="Cubiertos perdidos" valor={k.cubiertosPerdidosPeriodo} detalle={`${k.clientesRegistrados} clientes registrados`}
             color={k.cubiertosPerdidosPeriodo > 0 ? ESTADO.critico : ESTADO.bueno} />
      </Box>

      {/* ---------------- Ventas en el tiempo */}
      <Typography variant="h6" fontWeight="bold" mb={1.5}>Ventas</Typography>
      <Box sx={{ mb: 2.5 }}>
        <Panel titulo="Ingresos por día" subtitulo="Total vendido y parte que quedó a crédito" alto={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="etiqueta" {...ejeProps} minTickGap={16} />
              <YAxis {...ejeProps} tickFormatter={dineroCorto} width={56} />
              <Tooltip formatter={(v, n) => [dinero(v), n]} labelFormatter={(l) => `Día ${l}`} />
              <Legend />
              <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="credito" name="A crédito" stroke={SERIES[1]} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </Box>
      <Box sx={grid(2)}>
        <Panel titulo="Horas pico" subtitulo="Ingresos por hora del día: útil para planear personal y producción">
          {datos.ventasPorHora.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos.ventasPorHora} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="nombre" {...ejeProps} />
                <YAxis {...ejeProps} tickFormatter={dineroCorto} width={56} />
                <Tooltip formatter={(v, n, p) => [`${dinero(v)} (${p.payload.cantidad} ventas)`, 'Ingresos']} />
                <Bar dataKey="valor" fill={PRINCIPAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <SinDatos />}
        </Panel>
        <Panel titulo="Ventas por día de la semana" subtitulo="Identifica los días de mayor y menor demanda">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos.ventasPorDiaSemana} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="nombre" {...ejeProps} tickFormatter={(n) => n.slice(0, 3)} />
              <YAxis {...ejeProps} tickFormatter={dineroCorto} width={56} />
              <Tooltip formatter={(v, n, p) => [`${dinero(v)} (${p.payload.cantidad} ventas)`, 'Ingresos']} />
              <Bar dataKey="valor" fill={PRINCIPAL} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </Box>

      {/* ---------------- Productos */}
      <Typography variant="h6" fontWeight="bold" mb={1.5}>Productos</Typography>
      <Box sx={grid(2)}>
        <Panel titulo="Más vendidos (piezas)" subtitulo="Top 10: asegurar insumos y disponibilidad" alto={340}>
          <BarrasRanking datos={datos.topProductos} campo="cantidad" formato={(v) => `${v} pzas`} nombreSerie="Vendidos" />
        </Panel>
        <Panel titulo="Utilidad por producto" subtitulo="Top 10 por ganancia estimada (precio − costo)" alto={340}>
          <BarrasRanking
            datos={[...datos.topProductos].sort((a, b) => b.utilidad - a.utilidad)}
            campo="utilidad" nombreSerie="Utilidad" />
        </Panel>
        <Panel titulo="Ingresos por categoría" alto={300}>
          <BarrasRanking datos={datos.ingresosPorCategoria} nombreSerie="Ingresos" />
        </Panel>
        <Panel titulo="Menos vendidos" subtitulo="Candidatos a promoción o a retirar del menú" alto={300}>
          <BarrasRanking datos={datos.productosMenosVendidos} campo="cantidad" formato={(v) => `${v} pzas`}
                         nombreSerie="Vendidos" color={SERIES[1]} />
        </Panel>
      </Box>

      {/* ---------------- Clientes y crédito */}
      <Typography variant="h6" fontWeight="bold" mb={1.5}>Clientes y crédito</Typography>
      <Box sx={grid(2)}>
        <Panel titulo="Consumo por área del edificio" subtitulo="Qué áreas generan más ventas" alto={300}>
          <BarrasRanking datos={datos.ventasPorArea.slice(0, 10)} nombreSerie="Ingresos" />
        </Panel>
        <Panel titulo="Métodos de pago" subtitulo="Participación en el ingreso del periodo" alto={300}>
          {metodosPago.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metodosPago} dataKey="valor" nameKey="nombre" innerRadius="55%" outerRadius="80%"
                     paddingAngle={2} stroke="#fcfcfb" strokeWidth={2}>
                  {metodosPago.map((m, i) => <Cell key={m.nombre} fill={SERIES[i]} />)}
                </Pie>
                <Tooltip formatter={(v, n, p) => [`${dinero(v)} (${p.payload.cantidad} ventas)`, n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SinDatos />}
        </Panel>
        <Panel titulo="Adeudo por área" subtitulo="Dónde concentrar la cobranza" alto={300}>
          <BarrasRanking datos={datos.deudaPorArea.slice(0, 10)} nombreSerie="Adeudo" color={SERIES[1]} />
        </Panel>
        <Panel titulo="Principales deudores" subtitulo="Top 10 por saldo pendiente" alto={300}>
          <BarrasRanking datos={datos.topDeudores} nombreSerie="Adeudo" color={SERIES[1]} />
        </Panel>
        <Panel titulo="Ventas por cajero" alto={260}>
          <BarrasRanking datos={datos.ventasPorCajero} nombreSerie="Ingresos" />
        </Panel>
      </Box>

      {/* ---------------- Cubiertos */}
      <Typography variant="h6" fontWeight="bold" mb={1.5}>Cubiertos y utensilios</Typography>
      <Box sx={grid(2)}>
        <Panel titulo="Disponibilidad de utensilios" subtitulo="Piezas en cafetería vs. fuera" alto={300}>
          {datos.utensilios.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos.utensilios} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="nombre" {...ejeProps} />
                <YAxis {...ejeProps} allowDecimals={false} width={40} />
                <Tooltip />
                <Legend />
                <Bar dataKey="disponibles" name="En cafetería" stackId="u" fill={SERIES[0]} stroke="#fcfcfb" strokeWidth={2} />
                <Bar dataKey="fuera" name="Fuera" stackId="u" fill={SERIES[1]} stroke="#fcfcfb" strokeWidth={2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <SinDatos />}
        </Panel>
        <Panel titulo="Cubiertos fuera por área" subtitulo="Dónde ir a recuperarlos" alto={300}>
          <BarrasRanking datos={datos.cubiertosFueraPorArea} formato={(v) => `${v} pzas`} nombreSerie="Piezas" color={SERIES[1]} />
        </Panel>
      </Box>

      {/* ---------------- Insumos críticos */}
      <Typography variant="h6" fontWeight="bold" mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon sx={{ color: ESTADO.critico }} /> Insumos que requieren reabastecimiento
      </Typography>
      <Paper elevation={1} sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><b>Insumo</b></TableCell>
              <TableCell align="right"><b>Stock actual</b></TableCell>
              <TableCell align="right"><b>Stock mínimo</b></TableCell>
              <TableCell sx={{ minWidth: 160 }}><b>Cobertura</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datos.insumosCriticos.length ? datos.insumosCriticos.map((i) => {
              const actual = Number(i.stockActual);
              const minimo = Number(i.stockMinimo) || 1;
              const cobertura = Math.min(100, (actual / minimo) * 100);
              const agotado = actual <= 0;
              return (
                <TableRow key={i.nombre} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{i.nombre}</TableCell>
                  <TableCell align="right">{actual} {i.unidad.toLowerCase()}</TableCell>
                  <TableCell align="right">{Number(i.stockMinimo)} {i.unidad.toLowerCase()}</TableCell>
                  <TableCell>
                    <LinearProgress variant="determinate" value={cobertura}
                      sx={{ height: 8, borderRadius: 4, bgcolor: GRID,
                            '& .MuiLinearProgress-bar': { bgcolor: agotado ? ESTADO.critico : ESTADO.alerta } }} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" icon={<WarningAmberIcon />} label={agotado ? 'Agotado' : 'Bajo mínimo'}
                          color={agotado ? 'error' : 'warning'} />
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  Todo en orden: ningún insumo está por debajo de su mínimo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
