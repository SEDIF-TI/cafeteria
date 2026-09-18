import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export const Recetas = () => {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Cargar lista de productos y de insumos/materia prima al montar
  useEffect(() => {
    cargarCatalogos();
  }, []);

  // Cargar la receta actual cuando cambia el producto seleccionado
  useEffect(() => {
    if (productoId) {
      cargarReceta(productoId);
    } else {
      setIngredientes([]);
    }
  }, [productoId]);

  const cargarCatalogos = async () => {
    try {
      const [resProd, resIns] = await Promise.all([
        axios.get(`${API_BASE}/productos`),
        axios.get(`${API_BASE}/productos/insumos`) // Endpoint de insumos/materia prima
      ]);
      setProductos(resProd.data);
      setInsumos(resIns.data);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  };

  const cargarReceta = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/recetas/producto/${id}`);
      setIngredientes(res.data.map(item => ({
        insumoId: item.insumoId,
        cantidad: item.cantidad,
        insumoNombre: item.insumoNombre,
        unidadMedida: item.unidadMedida
      })));
    } catch (err) {
      console.error('Error al cargar la receta:', err);
    } finally {
      setLoading(false);
    }
  };

  const agregarIngrediente = () => {
    setIngredientes([...ingredientes, { insumoId: '', cantidad: 1 }]);
  };

  const removerIngrediente = (index) => {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const handleIngredienteChange = (index, field, value) => {
    const nuevos = [...ingredientes];
    nuevos[index][field] = value;

    if (field === 'insumoId') {
      const insumoEncontrado = insumos.find(i => i.id === Number(value));
      if (insumoEncontrado) {
        nuevos[index].unidadMedida = insumoEncontrado.unidadMedida || 'UNIDAD';
      }
    }

    setIngredientes(nuevos);
  };

  const guardarReceta = async (e) => {
    e.preventDefault();
    if (!productoId) return;

    // Formatear payload para IngredienteRequestDTO
    const payload = ingredientes.map(item => ({
      insumoId: Number(item.insumoId),
      cantidad: parseFloat(item.cantidad)
    }));

    try {
      await axios.post(`${API_BASE}/recetas/producto/${productoId}`, payload);
      setMensaje('Receta guardada con éxito');
      setTimeout(() => setMensaje(null), 3000);
      cargarReceta(productoId);
    } catch (err) {
      alert('Error al guardar la receta: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Gestión de Recetas y Fichas Técnicas</h2>

      {mensaje && <div style={{ color: 'green', marginBottom: '10px' }}>{mensaje}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label><strong>Selecciona Producto Prepado: </strong></label>
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {productoId && (
        <form onSubmit={guardarReceta}>
          <h3>Ingredientes de la Receta</h3>
          
          {loading ? (
            <p>Cargando receta...</p>
          ) : (
            <>
              {ingredientes.map((ing, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                  <select
                    value={ing.insumoId}
                    onChange={(e) => handleIngredienteChange(index, 'insumoId', e.target.value)}
                    required
                  >
                    <option value="">-- Insumo --</option>
                    {insumos.map(i => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={ing.cantidad}
                    onChange={(e) => handleIngredienteChange(index, 'cantidad', e.target.value)}
                    placeholder="Cantidad"
                    required
                  />

                  <span>{ing.unidadMedida || ''}</span>

                  <button type="button" onClick={() => removerIngrediente(index)}>
                    Quitar
                  </button>
                </div>
              ))}

              <button type="button" onClick={agregarIngrediente} style={{ marginTop: '10px' }}>
                + Agregar Insumo
              </button>

              <hr />

              <button type="submit" style={{ backgroundColor: '#28a745', color: '#fff', padding: '10px 20px' }}>
                Guardar Receta
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
};