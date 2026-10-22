import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent, CardActionArea,
  Button, IconButton, TextField, MenuItem, Chip, Alert, Stack, Divider, Autocomplete,
  FormControlLabel, Switch, Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PersonIcon from '@mui/icons-material/Person';

import ModalQRCliente from '../registro-cliente/ModalQRCliente';
import api from '../../api/axiosClient';
import { useFeedback } from '../../components/FeedbackProvider';

export default function Ventas() {
  const { notificar, cargar, finalizarCarga } = useFeedback();
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [openQRModal, setOpenQRModal] = useState(false);

  // Salida de cubiertos fuera de la cafetería
  const [utensilios, setUtensilios] = useState([]);
  const [llevaCubiertos, setLlevaCubiertos] = useState(false);
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [areaDestino, setAreaDestino] = useState('');
  const [cantidadesCubiertos, setCantidadesCubiertos] = useState({});

  const resetCubiertos = () => {
    setLlevaCubiertos(false);
    setCodigoEmpleado('');
    setAreaDestino('');
    setCantidadesCubiertos({});
  };

  const [hayTurno, setHayTurno] = useState(true);

  const cargarCatalogos = async () => {
    try {
      const [resProd, resClientes, resUtensilios, resTurno] = await Promise.all([
        api.get('/productos'),
        api.get('/clientes'),
        api.get('/utensilios/activos').catch(() => ({ data: [] })),
        api.get('/turnos/activo').catch(() => ({ data: null }))
      ]);

      const productosVenta = (resProd.data || []).filter((p) => Number(p.precio) > 0);
      setProductos(productosVenta);
      setClientes(resClientes.data || []);
      setUtensilios(resUtensilios.data || []);
      setHayTurno(!!resTurno.data);
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find((item) => item.productoId === producto.id);
    const stockDisp = Number(producto.stockDisponible) || 0;

    if (existe) {
      if (existe.cantidad + 1 > stockDisp) {
        notificar(`Stock insuficiente. Disponibilidad máxima estimada: ${stockDisp} porciones.`, 'warning');
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      if (stockDisp < 1) {
        notificar('Este producto no cuenta con insumos/stock suficiente para prepararse.', 'warning');
        return;
      }
      setCarrito([
        ...carrito,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: parseFloat(producto.precio) || 0,
          cantidad: 1
        }
      ]);
    }
  };

  const cambiarCantidad = (productoId, delta) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.productoId === productoId) {
            const nuevaCant = item.cantidad + delta;
            return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter((item) => item.productoId !== productoId));
  };

  const totalVenta = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const cambio = parseFloat(montoRecibido) ? Math.max(0, parseFloat(montoRecibido) - totalVenta) : 0;

  const handleProcesarVenta = async () => {
    if (carrito.length === 0) return;

    const montoNum = parseFloat(montoRecibido);

    if (metodoPago === 'EFECTIVO') {
      if (isNaN(montoNum) || montoNum < 0) {
        notificar('Ingresa un monto recibido válido y mayor o igual a cero.', 'warning');
        return;
      }
      if (montoNum < totalVenta) {
        notificar('El monto ingresado es menor al total de la compra.', 'warning');
        return;
      }
    }

    if (metodoPago === 'DEUDA' && !clienteSeleccionado) {
      notificar('Debes seleccionar un cliente obligatoriamente para registrar una venta a crédito/deuda.', 'warning');
      return;
    }

    const utensiliosSalida = Object.entries(cantidadesCubiertos)
      .filter(([, cant]) => Number(cant) > 0)
      .map(([utensilioId, cant]) => ({ utensilioId: Number(utensilioId), cantidad: Number(cant) }));

    if (llevaCubiertos) {
      if (!codigoEmpleado.trim() || !areaDestino.trim()) {
        notificar('Para llevarse cubiertos indica el código de empleado y el área destino.', 'warning');
        return;
      }
      if (utensiliosSalida.length === 0) {
        notificar('Indica al menos un cubierto y su cantidad.', 'warning');
        return;
      }
    }

    setLoading(true);
    cargar('Registrando la venta...');

    let usuarioSesionId = 4;
    try {
      const userObj = JSON.parse(localStorage.getItem('usuario'));
      if (userObj && userObj.id) usuarioSesionId = userObj.id;
    } catch {
      usuarioSesionId = 4;
    }

    const clienteIdCalculado = clienteSeleccionado
      ? Number(clienteSeleccionado.id || clienteSeleccionado.clienteId || clienteSeleccionado.pnId)
      : null;

    const payload = {
      usuarioId: usuarioSesionId,
      clienteId: clienteIdCalculado,
      estado: metodoPago === 'DEUDA' ? 'PENDIENTE' : 'PAGADO',
      metodoPago,
      total: totalVenta,
      montoRecibido: metodoPago === 'EFECTIVO' ? montoNum : (metodoPago === 'DEUDA' ? 0 : totalVenta),
      cambio: metodoPago === 'EFECTIVO' ? cambio : 0,
      items: carrito.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        subtotal: item.precio * item.cantidad
      })),
      llevaCubiertos,
      cubiertos: llevaCubiertos
        ? { codigoEmpleado: codigoEmpleado.trim(), area: areaDestino.trim(), utensilios: utensiliosSalida }
        : null
    };

    try {
      await api.post('/ventas', payload);

      resetCubiertos();
      setCarrito([]);
      setMontoRecibido('');
      setClienteSeleccionado(null);
      setMetodoPago('EFECTIVO');
      cargarCatalogos();
      notificar('¡Venta realizada con éxito!', 'success');
    } catch (error) {
      const errorMsg = error.response?.data?.message ||
                       (typeof error.response?.data === 'string' ? error.response.data : null) ||
                       'Ocurrió un error al procesar la venta.';
      notificar(errorMsg, 'error');
    } finally {
      setLoading(false);
      finalizarCarga();
    }
  };

  const totalArticulos = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  const faltaMonto = metodoPago === 'EFECTIVO' && (isNaN(parseFloat(montoRecibido)) || parseFloat(montoRecibido) < totalVenta);
  const faltaClienteDeuda = metodoPago === 'DEUDA' && !clienteSeleccionado;
  const puedeCobrar = carrito.length > 0 && hayTurno && !faltaMonto && !faltaClienteDeuda && !loading;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        width: '100%',
        minHeight: '100vh',
        bgcolor: '#f4f6f8',
        gap: { xs: 3, lg: 4 },
        p: { xs: 2, md: 4 },
        boxSizing: 'border-box',
        alignItems: 'flex-start'
      }}
    >
      {/* ================= COLUMNA IZQUIERDA: CATÁLOGO ================= */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <PointOfSaleIcon color="primary" fontSize="large" />
              <Typography variant="h4" fontWeight="900" color="text.primary">
                Punto de Venta
              </Typography>
            </Box>
            <Typography variant="subtitle1" color="text.secondary">
              Selecciona los productos para agregarlos al ticket de venta.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            sx={{
              color: 'primary.main',
              borderColor: 'primary.main',
              fontWeight: 'bold',
              borderRadius: 2,
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(105, 28, 50, 0.04)'
              }
            }}
            startIcon={<QrCodeIcon />}
            onClick={() => setOpenQRModal(true)}
          >
            QR Registro Cliente
          </Button>
        </Box>

        <Grid container spacing={3}>
          {productos.map((prod) => {
            const stock = Number(prod.stockDisponible) || 0;
            const agotado = stock <= 0;

            return (
              <Grid item xs={12} sm={6} md={6} lg={4} xl={3} key={prod.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    minHeight: '140px',
                    border: '2px solid',
                    borderColor: agotado ? '#e0e0e0' : 'transparent',
                    boxShadow: agotado ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
                    opacity: agotado ? 0.6 : 1,
                    transition: 'all 0.2s',
                    borderRadius: 4,
                    bgcolor: '#ffffff',
                    '&:hover': {
                      borderColor: agotado ? '#e0e0e0' : 'primary.main',
                      transform: agotado ? 'none' : 'translateY(-4px)',
                      boxShadow: agotado ? 'none' : '0 10px 24px rgba(105, 28, 50, 0.15)',
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => !agotado && agregarAlCarrito(prod)}
                    disabled={agotado}
                    sx={{ height: '100%', p: 2.5 }}
                  >
                    <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <Box mb={2}>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {prod.nombre}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-end">
                        <Typography variant="h5" fontWeight="900" color="#691c32">
                          ${Number(prod.precio).toFixed(2)}
                        </Typography>
                        <Chip
                          label={agotado ? 'Agotado' : `${stock} disp.`}
                          color={agotado ? 'default' : 'success'}
                          size="small"
                          sx={{ fontWeight: 'bold', borderRadius: 2 }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ================= COLUMNA DERECHA: TICKET + COBRO ================= */}
      <Box sx={{
        width: { xs: '100%', md: '450px', lg: '500px', xl: '38%' },
        flexShrink: 0,
        position: { md: 'sticky' },
        top: 88,
        alignSelf: { md: 'stretch' }
      }}>
        <Paper
          elevation={4}
          sx={{
            width: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            bgcolor: '#ffffff',
            border: '1px solid #e9ecef'
          }}
        >
          {/* Cabecera del Ticket */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            sx={{ p: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e9ecef' }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShoppingCartIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography variant="h5" fontWeight="800" color="text.primary" sx={{ m: 0 }}>
                Ticket de Venta
              </Typography>
            </Stack>
            <Chip
              label={`${totalArticulos} arts.`}
              sx={{ fontWeight: 'bold', bgcolor: '#f1f3f5', fontSize: '1rem', color: '#495057' }}
            />
          </Stack>

          {/* Cliente: siempre visible en el panel */}
          <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
            <Autocomplete
              options={clientes}
              getOptionLabel={(option) => {
                if (!option) return '';
                const numControl = option.numeroControl ? ` (N° ${option.numeroControl})` : '';
                const area = option.area ? ` - ${option.area}` : '';
                return `${option.nombre || ''}${numControl}${area}`;
              }}
              isOptionEqualToValue={(option, value) => {
                const optId = option.id || option.clienteId || option.pnId;
                const valId = value?.id || value?.clienteId || value?.pnId;
                return optId === valId;
              }}
              filterOptions={(options, { inputValue }) => {
                const term = inputValue.toLowerCase().trim();
                if (!term) return options;
                return options.filter((c) => {
                  const matchNombre = c.nombre?.toLowerCase().includes(term);
                  const matchControl = c.numeroControl?.toString().toLowerCase().includes(term);
                  const matchArea = c.area?.toLowerCase().includes(term);
                  return matchNombre || matchControl || matchArea;
                });
              }}
              value={clienteSeleccionado}
              onChange={(event, newValue) => {
                setClienteSeleccionado(newValue);
                // Los datos del empleado se toman de su registro: el cajero no tiene que capturarlos
                setCodigoEmpleado(newValue?.numeroControl || '');
                setAreaDestino(newValue?.area || '');
              }}
              renderInput={(params) => {
                // En esta version de MUI params.InputProps puede venir undefined:
                // lo normalizamos para no reventar al leer startAdornment.
                const inputProps = params.InputProps || {};
                return (
                  <TextField
                    {...params}
                    label="Cliente (Nombre o N° de Control)"
                    placeholder="En blanco = Público General"
                    fullWidth
                    size="small"
                    InputProps={{
                      ...inputProps,
                      startAdornment: (
                        <>
                          <PersonIcon sx={{ color: 'text.disabled', ml: 0.5, mr: 0.5 }} fontSize="small" />
                          {inputProps.startAdornment}
                        </>
                      ),
                      sx: { borderRadius: 2 }
                    }}
                  />
                );
              }}
              noOptionsText="No se encontraron clientes"
            />
          </Box>

          {carrito.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                bgcolor: '#fafafa',
                width: '100%',
                minHeight: '240px'
              }}
            >
              <RemoveShoppingCartIcon sx={{ fontSize: 80, color: '#dee2e6', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" align="center" fontWeight="500">
                El ticket está vacío.
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" mt={1}>
                Selecciona productos del catálogo para comenzar.
              </Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column">
              {/* Lista de productos */}
              <Stack
                direction="row"
                alignItems="center"
                sx={{ px: 3, py: 1.5, bgcolor: '#f8f9fa', borderTop: '1px solid #e9ecef', borderBottom: '1px solid #e9ecef' }}
              >
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ flex: 1 }}>PRODUCTO</Typography>
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ width: '110px', textAlign: 'center' }}>CANT.</Typography>
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ width: '80px', textAlign: 'right' }}>SUBT.</Typography>
                <Box sx={{ width: '36px' }}></Box>
              </Stack>

              <Box sx={{ maxHeight: { xs: '38vh', md: 'calc(100vh - 560px)' }, minHeight: '110px', overflowY: 'auto', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#ced4da', borderRadius: '4px' } }}>
                {carrito.map((item) => (
                  <Stack
                    key={item.productoId}
                    direction="row"
                    alignItems="center"
                    sx={{
                      px: 3, py: 2,
                      borderBottom: '1px solid #f1f3f5',
                      '&:hover': { bgcolor: '#fdfdfd' }
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, pr: 1.5 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="700"
                        color="text.primary"
                        sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {item.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        ${item.precio.toFixed(2)} c/u
                      </Typography>
                    </Box>

                    <Box sx={{ width: '110px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ border: '1px solid #dee2e6', borderRadius: 2, overflow: 'hidden', bgcolor: '#ffffff' }}
                      >
                        <IconButton
                          onClick={() => cambiarCantidad(item.productoId, -1)}
                          sx={{ color: 'text.secondary', p: 0.75, borderRadius: 0, bgcolor: '#f8f9fa', '&:hover': { bgcolor: '#e9ecef' } }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ width: '32px', textAlign: 'center' }}>
                          {item.cantidad}
                        </Typography>
                        <IconButton
                          onClick={() => cambiarCantidad(item.productoId, 1)}
                          sx={{ color: 'text.primary', p: 0.75, borderRadius: 0, bgcolor: '#f8f9fa', '&:hover': { bgcolor: '#e9ecef' } }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>

                    <Box sx={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="subtitle1" fontWeight="900" color="text.primary">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </Typography>
                    </Box>

                    <Box sx={{ width: '36px', textAlign: 'right', flexShrink: 0 }}>
                      <IconButton color="error" onClick={() => eliminarDelCarrito(item.productoId)} sx={{ p: 0.75 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>
                ))}
              </Box>

              {/* ===== Zona de cobro, dentro del mismo panel ===== */}
              <Box sx={{ p: 3, bgcolor: '#ffffff', borderTop: '1px solid #e9ecef' }}>
                <TextField
                  select
                  label="Método de Pago"
                  fullWidth
                  size="small"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                  <MenuItem value="TARJETA">Tarjeta de Débito / Crédito</MenuItem>
                  <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                  <MenuItem value="DEUDA">Crédito / Fiado (Deuda)</MenuItem>
                </TextField>

                {metodoPago === 'EFECTIVO' && (
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      label="Monto Recibido ($)"
                      type="number"
                      fullWidth
                      value={montoRecibido}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || parseFloat(val) >= 0) {
                          setMontoRecibido(val);
                        }
                      }}
                      inputProps={{ min: 0, step: 'any' }}
                      InputProps={{ sx: { fontSize: '1.15rem', fontWeight: 'bold', borderRadius: 2 } }}
                    />
                    {parseFloat(montoRecibido) >= totalVenta && totalVenta > 0 && (
                      <Alert severity="success" sx={{ mt: 1.5, fontWeight: 'bold', borderRadius: 2, py: 0.5 }}>
                        Cambio a entregar: ${cambio.toFixed(2)}
                      </Alert>
                    )}
                  </Box>
                )}

                {faltaClienteDeuda && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
                    Selecciona un cliente arriba para registrar la deuda.
                  </Alert>
                )}

                {/* Cubiertos */}
                <FormControlLabel
                  sx={{ mb: llevaCubiertos ? 1 : 0 }}
                  control={
                    <Switch
                      checked={llevaCubiertos}
                      onChange={(e) => {
                        const activo = e.target.checked;
                        setLlevaCubiertos(activo);
                        if (activo && clienteSeleccionado) {
                          setCodigoEmpleado(clienteSeleccionado.numeroControl || codigoEmpleado);
                          setAreaDestino(clienteSeleccionado.area || areaDestino);
                        }
                      }}
                      color="warning"
                    />
                  }
                  label={<Typography fontWeight="bold" variant="body2">¿Se lleva cubiertos fuera de la cafetería?</Typography>}
                />

                <Collapse in={llevaCubiertos} timeout="auto" unmountOnExit>
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <TextField
                      label="Código de empleado"
                      value={codigoEmpleado}
                      onChange={(e) => setCodigoEmpleado(e.target.value)}
                      fullWidth
                      size="small"
                      required
                    />
                    <TextField
                      label="Área / ubicación destino (ej. Piso 2 - Jurídico)"
                      value={areaDestino}
                      onChange={(e) => setAreaDestino(e.target.value)}
                      fullWidth
                      size="small"
                      required
                    />
                    {utensilios.length === 0 ? (
                      <Alert severity="warning" sx={{ py: 0.5 }}>No hay utensilios registrados. Dalos de alta en el módulo Utensilios.</Alert>
                    ) : (
                      utensilios.map((u) => (
                        <TextField
                          key={u.id}
                          label={`${u.nombre} (disp.: ${u.stockDisponible})`}
                          type="number"
                          size="small"
                          value={cantidadesCubiertos[u.id] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (Number(val) >= 0 && Number(val) <= u.stockDisponible)) {
                              setCantidadesCubiertos((prev) => ({ ...prev, [u.id]: val }));
                            }
                          }}
                          inputProps={{ min: 0, max: u.stockDisponible }}
                        />
                      ))
                    )}
                  </Stack>
                </Collapse>

                {!hayTurno && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
                    No hay un turno de caja abierto. Abre uno en <b>Caja y Turnos</b> para registrar la venta.
                  </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight="700" color="text.secondary">
                    TOTAL A PAGAR
                  </Typography>
                  <Typography variant="h4" fontWeight="900" color="#691c32">
                    ${totalVenta.toFixed(2)}
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={!puedeCobrar}
                  startIcon={<PointOfSaleIcon sx={{ fontSize: '1.8rem !important' }} />}
                  onClick={handleProcesarVenta}
                  sx={{
                    backgroundColor: 'primary.main',
                    py: 1.8,
                    borderRadius: 3,
                    fontWeight: '800',
                    fontSize: '1.15rem',
                    textTransform: 'none',
                    boxShadow: '0 6px 16px rgba(105, 28, 50, 0.25)',
                    '&:hover': { backgroundColor: 'primary.dark' }
                  }}
                >
                  {loading ? 'Procesando...' : 'Cobrar Venta'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ================= MODAL CÓDIGO QR PARA REGISTRO DE CLIENTE ================= */}
      <ModalQRCliente
        open={openQRModal}
        onClose={() => setOpenQRModal(false)}
      />
    </Box>
  );
}
