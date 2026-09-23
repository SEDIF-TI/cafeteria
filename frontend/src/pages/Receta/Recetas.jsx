import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Tooltip,
  Autocomplete,
  InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import EditIcon from "@mui/icons-material/Edit";
import AssessmentIcon from "@mui/icons-material/Assessment";
import api from "../../api/axiosClient";

const PRIMARY_COLOR = "#6B1D2F";

export default function Recetas() {
  const [tabActual, setTabActual] = useState(0);

  // Listas de productos filtradas según esDirecto
  const [productosPreparados, setProductosPreparados] = useState([]);
  const [insumosDisponibles, setInsumosDisponibles] = useState([]);
  const [resumenRecetas, setResumenRecetas] = useState([]);

  // Formulario de edición/creación
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState("");
  const [detallesReceta, setDetallesReceta] = useState([]);

  // Estados de carga e interfaz
  const [loading, setLoading] = useState(true);
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const extraerArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.content)) return data.content;
    return [];
  };

  const cargarDatosIniciales = async () => {
    setLoading(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      const resProd = await api.get("/productos");
      const todosProductos = extraerArray(resProd.data);

      // FILTRADO SEGÚN Producto.java:
      // esDirecto === true  => Productos finales (ej. café late, papas)
      // esDirecto === false => Materia Prima / Insumos requeridos (ej. Harina, Leche)
      const preparados = todosProductos.filter((p) => p.esDirecto === true);
      const insumos = todosProductos.filter((p) => p.esDirecto === false);

      setProductosPreparados(preparados);
      setInsumosDisponibles(insumos);
    } catch (error) {
      console.error("Error al cargar productos e insumos:", error);
      setMensaje({ tipo: "error", texto: "Error al cargar el catálogo de productos." });
    }

    try {
      const resResumen = await api.get("/recetas/resumen");
      setResumenRecetas(extraerArray(resResumen.data));
    } catch (error) {
      console.error("Error al cargar resumen de recetas:", error);
      setResumenRecetas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarTab = (event, newTab) => {
    setTabActual(newTab);
    setMensaje({ tipo: "", texto: "" });
  };

  const limpiarFormulario = () => {
    setProductoSeleccionadoId("");
    setDetallesReceta([]);
  };

  const handleSeleccionarProducto = async (productoObj) => {
    if (!productoObj) {
      limpiarFormulario();
      return;
    }

    const id = Number(productoObj.id);
    setProductoSeleccionadoId(id);
    setMensaje({ tipo: "", texto: "" });
    setLoadingReceta(true);

    try {
      const response = await api.get(`/recetas/producto/${id}`);
      const ingredientes = extraerArray(response.data);

      if (ingredientes.length > 0) {
        const mapeados = ingredientes.map((item) => ({
          insumoId: Number(item.insumoId || item.productoInsumoId),
          cantidad: item.cantidad
        }));
        setDetallesReceta(mapeados);
      } else {
        setDetallesReceta([]);
      }
    } catch (error) {
      console.error("Error al obtener la receta:", error);
      setDetallesReceta([]);
    } finally {
      setLoadingReceta(false);
    }
  };

  const handleAgregarInsumo = () => {
    setDetallesReceta([...detallesReceta, { insumoId: "", cantidad: "" }]);
  };

  const handleEliminarInsumo = (index) => {
    const copia = [...detallesReceta];
    copia.splice(index, 1);
    setDetallesReceta(copia);
  };

  const handleInsumoChange = (index, nuevoInsumoObj) => {
    const copia = [...detallesReceta];
    copia[index].insumoId = nuevoInsumoObj ? Number(nuevoInsumoObj.id) : "";
    copia[index].cantidad = ""; // Resetea la cantidad al cambiar de insumo
    setDetallesReceta(copia);
  };

  const handleCantidadChange = (index, value) => {
    const copia = [...detallesReceta];
    copia[index].cantidad = value;
    setDetallesReceta(copia);
  };

  const handleGuardarReceta = async () => {
    setMensaje({ tipo: "", texto: "" });

    if (!productoSeleccionadoId) {
      setMensaje({ tipo: "warning", texto: "Por favor, selecciona un producto." });
      return;
    }

    if (detallesReceta.length === 0) {
      setMensaje({ tipo: "warning", texto: "Debes agregar al menos un insumo a la receta." });
      return;
    }

    const incompleto = detallesReceta.some(
      (d) => !d.insumoId || !d.cantidad || Number(d.cantidad) <= 0
    );

    if (incompleto) {
      setMensaje({
        tipo: "warning",
        texto: "Todos los ingredientes deben tener un insumo seleccionado y una cantidad mayor a 0."
      });
      return;
    }

    setGuardando(true);
    try {
      const payload = detallesReceta.map((d) => ({
        insumoId: Number(d.insumoId),
        cantidad: parseFloat(d.cantidad)
      }));

      await api.post(`/recetas/producto/${productoSeleccionadoId}`, payload);
      setMensaje({ tipo: "success", texto: "Ficha técnica guardada correctamente." });
      cargarDatosIniciales();
    } catch (error) {
      console.error("Error al guardar la receta:", error);
      setMensaje({
        tipo: "error",
        texto: error.response?.data?.message || "Error al guardar la receta en el servidor."
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarDesdeResumen = async (productoId) => {
    setTabActual(1);
    const prodObj = productosPreparados.find((p) => Number(p.id) === Number(productoId)) || { id: productoId };
    await handleSeleccionarProducto(prodObj);
  };

  const productoObjetoActual =
    productosPreparados.find((p) => Number(p.id) === Number(productoSeleccionadoId)) || null;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress sx={{ color: PRIMARY_COLOR }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, maxWidth: 1100, margin: "0 auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <RestaurantMenuIcon sx={{ color: PRIMARY_COLOR, fontSize: 32 }} />
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#2C3E50" }}>
          Gestión de Recetas y Fichas Técnicas
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Consulta la disponibilidad de producción basada en tu inventario o administra las fórmulas de preparado.
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabActual}
          onChange={handleCambiarTab}
          indicatorColor="primary"
          textColor="inherit"
          sx={{
            "& .Mui-selected": { color: PRIMARY_COLOR, fontWeight: "bold" },
            "& .MuiTabs-indicator": { backgroundColor: PRIMARY_COLOR }
          }}
        >
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Resumen de Disponibilidad" />
          <Tab icon={<RestaurantMenuIcon />} iconPosition="start" label="Crear / Editar Ficha Técnica" />
        </Tabs>
      </Paper>

      {mensaje.texto && (
        <Alert severity={mensaje.tipo} onClose={() => setMensaje({ tipo: "", texto: "" })} sx={{ mb: 2 }}>
          {mensaje.texto}
        </Alert>
      )}

      {/* PESTAÑA 0: RESUMEN DE DISPONIBILIDAD */}
      {tabActual === 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#333" }}>
              Rendimiento Estimado de Recetas
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ backgroundColor: PRIMARY_COLOR }}>
                  <TableRow>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Producto Preparado</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Ingredientes</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Insumo Limítrofe</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Stock Máximo Estimado</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resumenRecetas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        No hay recetas registradas todavía. Ve a la pestaña "Crear / Editar Ficha Técnica".
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumenRecetas.map((row) => (
                      <TableRow key={row.productoId} hover>
                        <TableCell sx={{ fontWeight: "bold" }}>{row.productoNombre}</TableCell>
                        <TableCell align="center">{row.totalIngredientes} insumos</TableCell>
                        <TableCell>{row.insumoLimitante || "N/A"}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.porcionesDisponibles ?? 0} porciones`}
                            color={(row.porcionesDisponibles ?? 0) > 0 ? "success" : "error"}
                            variant="filled"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Editar Ficha Técnica">
                            <IconButton color="primary" onClick={() => handleEditarDesdeResumen(row.productoId)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* PESTAÑA 1: CREAR / EDITAR FICHA TÉCNICA */}
      {tabActual === 1 && (
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  1. Selecciona el Producto
                </Typography>
                {productoSeleccionadoId && (
                  <Button size="small" color="inherit" onClick={limpiarFormulario}>
                    Limpiar Selección
                  </Button>
                )}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Autocomplete
                  options={productosPreparados}
                  getOptionLabel={(option) =>
                    option ? `${option.nombre || ''} ${option.precio ? `- $${Number(option.precio).toFixed(2)}` : ''}` : ''
                  }
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value?.id)}
                  value={productoObjetoActual}
                  onChange={(event, newValue) => handleSeleccionarProducto(newValue)}
                  sx={{ minWidth: 320 }}
                  noOptionsText="No hay productos registrados"
                  renderInput={(params) => (
                    <TextField {...params} label="Seleccionar Producto" size="small" />
                  )}
                />

                {productoSeleccionadoId !== "" && (
                  <Chip
                    icon={<InfoOutlinedIcon />}
                    label="Preparación al momento"
                    variant="outlined"
                    sx={{ color: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
                  />
                )}
              </Box>
            </Box>

            <hr style={{ border: "0.5px solid #eee", marginBottom: "20px" }} />

            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              2. Insumos y Cantidades (Materia Prima)
            </Typography>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAgregarInsumo}
              disabled={!productoSeleccionadoId}
              sx={{
                mb: 2,
                color: PRIMARY_COLOR,
                borderColor: PRIMARY_COLOR,
                "&:hover": { borderColor: PRIMARY_COLOR, backgroundColor: "#FFF0F3" }
              }}
            >
              Agregar Insumo
            </Button>

            {loadingReceta ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} sx={{ color: PRIMARY_COLOR }} />
              </Box>
            ) : detallesReceta.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", backgroundColor: "#fafafa", mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {productoSeleccionadoId
                    ? "Este producto no tiene insumos configurados aún. Haz clic en '+ Agregar Insumo'."
                    : "Selecciona un producto arriba para ver o crear su receta."}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: PRIMARY_COLOR }}>
                    <TableRow>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>Insumo / Materia Prima</TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }} width="280">Cantidad Requerida</TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }} width="80" align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detallesReceta.map((row, index) => {
                      const insumoObj = insumosDisponibles.find((i) => Number(i.id) === Number(row.insumoId)) || null;

                      // Obtención dinámica de la unidad de medida
                      const unidadStr = String(
                        insumoObj?.inventario?.unidadMedida || insumoObj?.unidadMedida || ""
                      ).toUpperCase();

                      const esPieza = unidadStr === "UNIDAD" || unidadStr.includes("PIEZA") || unidadStr.includes("PZA");
                      const esGramos = unidadStr.includes("GRAMO") || unidadStr.includes("KILO");
                      const esMililitros = unidadStr.includes("MILILITRO") || unidadStr.includes("LITRO");

                      // Determinación de sufijo y helper text (Opción A)
                      let sufijo = "";
                      let textoAyuda = "Selecciona un insumo";

                      if (insumoObj) {
                        if (esPieza) {
                          sufijo = "pza";
                          textoAyuda = "Número entero (ej. 1)";
                        } else if (esGramos) {
                          sufijo = "g";
                          textoAyuda = "Cantidad en Gramos (ej. 250)";
                        } else if (esMililitros) {
                          sufijo = "ml";
                          textoAyuda = "Cantidad en Mililitros (ej. 500)";
                        }
                      }

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Autocomplete
                              options={insumosDisponibles}
                              getOptionLabel={(option) => {
                                if (!option) return "";
                                const nom = option.nombre || "";
                                const uni = option.inventario?.unidadMedida || option.unidadMedida || "";
                                return uni ? `${nom} (${uni})` : nom;
                              }}
                              isOptionEqualToValue={(option, value) => Number(option.id) === Number(value?.id)}
                              value={insumoObj}
                              onChange={(event, newValue) => handleInsumoChange(index, newValue)}
                              noOptionsText="No hay materias primas disponibles"
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Seleccionar materia prima" size="small" fullWidth />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              disabled={!insumoObj}
                              inputProps={{ 
                                step: esPieza ? "1" : "any",
                                min: "0" 
                              }}
                              InputProps={{
                                endAdornment: sufijo ? (
                                  <InputAdornment position="end">
                                    <Typography variant="caption" sx={{ fontWeight: "bold", color: "#555" }}>
                                      {sufijo}
                                    </Typography>
                                  </InputAdornment>
                                ) : null
                              }}
                              value={row.cantidad}
                              onChange={(e) => handleCantidadChange(index, e.target.value)}
                              onKeyDown={(e) => {
                                if (esPieza && (e.key === '.' || e.key === ',')) {
                                  e.preventDefault();
                                }
                              }}
                              placeholder={esPieza ? "1" : "0"}
                              fullWidth
                              helperText={textoAyuda}
                              FormHelperTextProps={{ 
                                sx: { 
                                  margin: 0, 
                                  fontSize: "0.72rem", 
                                  fontWeight: "500",
                                  color: insumoObj ? PRIMARY_COLOR : "#888" 
                                } 
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton color="error" onClick={() => handleEliminarInsumo(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleGuardarReceta}
              disabled={guardando || !productoSeleccionadoId}
              sx={{
                backgroundColor: PRIMARY_COLOR,
                "&:hover": { backgroundColor: "#501422" }
              }}
            >
              {guardando ? "Guardando..." : "Guardar Ficha Técnica"}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}