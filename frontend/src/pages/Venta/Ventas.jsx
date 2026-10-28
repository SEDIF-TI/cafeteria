import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent, CardActionArea,
  Button, IconButton, TextField, MenuItem, Chip, Alert, Stack, Divider, Autocomplete,
  FormControlLabel, Switch, Collapse, Checkbox
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

  // Salida de cubiertos fuera de la cafetería (kit estándar)
  const [llevaCubiertos, setLlevaCubiertos] = useState(false);
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [areaDestino, setAreaDestino] = useState('');
  const [nombreRefCubiertos, setNombreRefCubiertos] = useState('');
  const [juegosCubiertos, setJuegosCubiertos] = useState(1);
  const [incluyeCharola, setIncluyeCharola] = useState(false);

  const resetCubiertos = () => {
    setLlevaCubiertos(false);
    setCodigoEmpleado('');
    setAreaDestino('');
    setNombreRefCubiertos('');
    setJuegosCubiertos(1);
    setIncluyeCharola(false);
  };

  const [hayTurno, setHayTurno] = useState(true);

  const cargarCatalogos = async () => {
    try {
      const [resProd, resClientes, resTurno] = await Promise.all([
        api.get('/productos'),
        api.get('/clientes'),
        api.get('/turnos/activo').catch(() => ({ data: null }))
      ]);

      // Solo productos vendibles (precio > 0) y ACTIVOS: al desactivar en el Menú,
      // el producto deja de aparecer en el Punto de Venta ese día.
      const productosVenta = (resProd.data || []).filter((p) => Number(p.precio) > 0 && p.activo !== false);
      setProductos(productosVenta);
      setClientes(resClientes.data || []);
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

    // Público general sin área: no se bloquea; el backend lo registra como "Sin área".
    const juegosNum = Math.max(1, parseInt(juegosCubiertos, 10) || 1);

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
        ? {
            codigoEmpleado: codigoEmpleado.trim() || null,
            nombre: nombreRefCubiertos.trim() || null,
            area: areaDestino.trim() || null,
            juegos: juegosNum,
            incluyeCharola
          }
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
        bgcolor: '#f8fafc',
        gap: { xs: 3, lg: 4 },
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
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "900",
                  color: "text.primary"
                }}>
                Punto de Venta
              </Typography>
            </Box>
            <Typography variant="subtitle1" sx={{
              color: "text.secondary"
            }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }} key={prod.id}>
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
                      <Box sx={{
                        mb: 2
                      }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                          {prod.nombre}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: "900",
                            color: "#fc6c9c"
                          }}>
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
            sx={{ alignItems: 'center', justifyContent: 'space-between', p: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e9ecef' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ShoppingCartIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "800",
                  color: "text.primary",
                  m: 0
                }}>
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
              renderInput={(params) => (
                // MUI v9 entrega todo en params.slotProps (input lleva la ref y los iconos
                // de limpiar/desplegar; htmlInput lleva la ref del <input>). Se MEZCLA con
                // lo nuestro: si se reemplaza, Autocomplete pierde la ref y truena al enfocar.
                <TextField
                  {...params}
                  label="Cliente (Nombre o N° de Control)"
                  placeholder="En blanco = Público General"
                  fullWidth
                  size="small"
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      startAdornment: (
                        <>
                          <PersonIcon sx={{ color: 'text.disabled', ml: 0.5, mr: 0.5 }} fontSize="small" />
                          {params.slotProps.input.startAdornment}
                        </>
                      ),
                      sx: { borderRadius: 2 }
                    }
                  }}
                />
              )}
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
              <Typography
                variant="h6"
                align="center"
                sx={{
                  color: "text.secondary",
                  fontWeight: "500"
                }}>
                El ticket está vacío.
              </Typography>
              <Typography
                variant="body1"
                align="center"
                sx={{
                  color: "text.secondary",
                  mt: 1
                }}>
                Selecciona productos del catálogo para comenzar.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Lista de productos */}
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  px: 3,
                  py: 1.5,
                  bgcolor: '#f8f9fa',
                  borderTop: '1px solid #e9ecef',
                  borderBottom: '1px solid #e9ecef'
                }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: "700",
                    color: "text.secondary",
                    flex: 1
                  }}>PRODUCTO</Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: "700",
                    color: "text.secondary",
                    width: '110px',
                    textAlign: 'center'
                  }}>CANT.</Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: "700",
                    color: "text.secondary",
                    width: '80px',
                    textAlign: 'right'
                  }}>SUBT.</Typography>
                <Box sx={{ width: '36px' }}></Box>
              </Stack>

              <Box sx={{ maxHeight: { xs: '38vh', md: 'calc(100vh - 560px)' }, minHeight: '110px', overflowY: 'auto', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#ced4da', borderRadius: '4px' } }}>
                {carrito.map((item) => (
                  <Stack
                    key={item.productoId}
                    direction="row"
                    sx={{
                      alignItems: "center",
                      px: 3,
                      py: 2,
                      borderBottom: '1px solid #f1f3f5',
                      '&:hover': { bgcolor: '#fdfdfd' }
                    }}>
                    <Box sx={{ flex: 1, minWidth: 0, pr: 1.5 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: "700",
                          color: "text.primary",
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                        {item.nombre}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: "500"
                        }}>
                        ${item.precio.toFixed(2)} c/u
                      </Typography>
                    </Box>

                    <Box sx={{ width: '110px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: "center",
                          border: '1px solid #dee2e6',
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: '#ffffff'
                        }}>
                        <IconButton
                          onClick={() => cambiarCantidad(item.productoId, -1)}
                          sx={{ color: 'text.secondary', p: 0.75, borderRadius: 0, bgcolor: '#f8f9fa', '&:hover': { bgcolor: '#e9ecef' } }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: "bold",
                            width: '32px',
                            textAlign: 'center'
                          }}>
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
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: "900",
                          color: "text.primary"
                        }}>
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
                  slotProps={{
                    input: { sx: { borderRadius: 2 } }
                  }}
                >
                  <MenuItem value="EFECTIVO">Efectivo</MenuItem>
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
                      slotProps={{
                        input: { sx: { fontSize: '1.15rem', fontWeight: 'bold', borderRadius: 2 } },
                        htmlInput: { min: 0, step: 'any' }
                      }} />
                    {parseFloat(montoRecibido) >= totalVenta && totalVenta > 0 && (
                      <Alert
                        severity="success"
                        icon={false}
                        sx={{ mt: 1.5, borderRadius: 2, py: 1.5, '& .MuiAlert-message': { width: '100%' } }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Cambio a entregar
                          </Typography>
                          <Typography sx={{ fontWeight: 'bold', fontSize: '2.2rem', lineHeight: 1 }}>
                            ${cambio.toFixed(2)}
                          </Typography>
                        </Box>
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
                  label={<Typography variant="body2" sx={{
                    fontWeight: "bold"
                  }}>¿Se lleva cubiertos fuera de la cafetería?</Typography>}
                />

                <Collapse in={llevaCubiertos} timeout="auto" unmountOnExit>
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                      Se registra el <b>kit estándar</b>: plato, vaso, cuchara, cuchillo y tenedor.
                    </Alert>

                    {clienteSeleccionado ? (
                      <TextField
                        label="Área"
                        value={areaDestino}
                        onChange={(e) => setAreaDestino(e.target.value)}
                        fullWidth
                        size="small"
                        helperText="Tomada del cliente; puedes ajustarla."
                      />
                    ) : (
                      <>
                        <TextField
                          label="Área destino (ej. Piso 2 - Jurídico)"
                          value={areaDestino}
                          onChange={(e) => setAreaDestino(e.target.value)}
                          fullWidth
                          size="small"
                          helperText="Público general: si la dejas vacía, se registra como 'Sin área'."
                        />
                        <TextField
                          label="Nombre / referencia (opcional)"
                          value={nombreRefCubiertos}
                          onChange={(e) => setNombreRefCubiertos(e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </>
                    )}

                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <TextField
                        label="¿Cuántos juegos?"
                        type="number"
                        size="small"
                        value={juegosCubiertos}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || Number(v) >= 1) setJuegosCubiertos(v);
                        }}
                        sx={{ width: 150 }}
                        slotProps={{
                          htmlInput: { min: 1, step: 1 }
                        }}
                      />
                      <FormControlLabel
                        control={<Checkbox checked={incluyeCharola} onChange={(e) => setIncluyeCharola(e.target.checked)} />}
                        label="Incluye charola"
                      />
                    </Stack>
                  </Stack>
                </Collapse>

                {!hayTurno && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
                    No hay un turno de caja abierto. Abre uno en <b>Caja y Turnos</b> para registrar la venta.
                  </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "700",
                      color: "text.secondary"
                    }}>
                    TOTAL A PAGAR
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "900",
                      color: "#fc6c9c"
                    }}>
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
