import { createTheme } from '@mui/material/styles';
import { coloresInstitucionales } from './colors';

export const theme = createTheme({
    palette: {
        primary: {
            main: coloresInstitucionales.primario,
            dark: coloresInstitucionales.primarioOscuro,
            contrastText: '#ffffff',
        },
        secondary: {
            main: coloresInstitucionales.secundario,
            dark: coloresInstitucionales.secundarioOscuro,
            contrastText: '#ffffff',
        },
        background: {
            default: coloresInstitucionales.fondo,
            paper: coloresInstitucionales.blanco,
        },
        error: { main: coloresInstitucionales.error },
        success: { main: coloresInstitucionales.exito },
        warning: { main: coloresInstitucionales.advertencia },
        text: {
            primary: coloresInstitucionales.textoPrincipal,
            secondary: coloresInstitucionales.textoSecundario,
        }
    },
    components: {
        // Ejemplo de personalización global para los botones
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;