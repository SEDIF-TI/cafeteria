import { TablePagination } from '@mui/material';

/**
 * Controles de paginación en español, consistentes para todas las tablas.
 * Se alimenta del objeto que devuelve el hook usePaginacion.
 */
export default function PaginacionTabla({ pag, opciones = [5, 10, 25, 50] }) {
  return (
    <TablePagination
      component="div"
      count={pag.count}
      page={pag.page}
      onPageChange={pag.onPageChange}
      rowsPerPage={pag.rowsPerPage}
      onRowsPerPageChange={pag.onRowsPerPageChange}
      rowsPerPageOptions={opciones}
      labelRowsPerPage="Filas por página:"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
    />
  );
}
