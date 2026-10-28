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
            // Barra inferior a todo el ancho del área de trabajo, en blanco y
            // pegada al fondo (MainLayout la coloca como hermana del contenido,
            // fuera del padding, por eso llega de borde a borde).
            sx={{
                width: '100%',
                py: 2,
                px: 2,
                textAlign: 'center',
                bgcolor: '#ffffff',
                borderTop: '1px solid #e2e8f0',
            }}
        >
            <Typography
                variant="subtitle1"
                sx={{
                    fontWeight: "bold",
                    color: 'primary.main',
                    letterSpacing: 0.3
                }}>
                © {anio} Desarrollado por el Departamento de Soporte Técnico
            </Typography>
        </Box>
    );
}
