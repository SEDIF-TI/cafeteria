import { Box, Typography } from '@mui/material';

/**
 * Pie de página del sistema.
 *
 * Lo monta `MainLayout`, así que aparece en todas las pantallas sin que cada
 * una tenga que incluirlo.
 *
 * El año se calcula en cada render en lugar de escribirse como literal: así no
 * depende de que alguien se acuerde de actualizarlo cada 1 de enero.
 */
export default function PieDePagina() {
    const anio = new Date().getFullYear();

    return (
        <Box
            component="footer"
            // `mt: auto` lo empuja al fondo de la columna que declara
            // MainLayout cuando el contenido es corto. Al no usar posición
            // fija, nunca tapa la última fila de una tabla.
            sx={{
                mt: 'auto',
                pt: 3,
                pb: 1,
                textAlign: 'center',
            }}
        >
            <Typography variant="caption" color="text.secondary">
                Departamento de Soporte Técnico {anio}
            </Typography>
        </Box>
    );
}
