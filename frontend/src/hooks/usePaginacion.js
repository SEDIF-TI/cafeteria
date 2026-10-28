import { useState, useEffect, useMemo } from 'react';

/**
 * Paginación de tablas en memoria.
 *
 * Recibe la lista YA ordenada (p. ej. de más reciente a más antigua) y
 * devuelve solo la "rebanada" de la página actual más los props que necesita
 * <PaginacionTabla />.
 *
 * Si la lista cambia de tamaño (búsqueda / filtro) y la página queda fuera de
 * rango, se regresa automáticamente a la primera.
 */
export default function usePaginacion(items, filasIniciales = 10) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(filasIniciales);

  const lista = Array.isArray(items) ? items : [];

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(lista.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(0);
  }, [lista.length, rowsPerPage, page]);

  const pagina = useMemo(
    () => lista.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [lista, page, rowsPerPage]
  );

  const onPageChange = (_e, nueva) => setPage(nueva);
  const onRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return { pagina, page, rowsPerPage, count: lista.length, onPageChange, onRowsPerPageChange };
}
