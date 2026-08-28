import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

export default function GlobalStyles() {
    return (
        <MuiGlobalStyles
            styles={{
                // Estilos globales aplicados a todo el sitio
                body: {
                    margin: 0,
                    padding: 0,
                    backgroundColor: '#f4f6f8', // Color de fondo general para las páginas
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                },
                // Clases reutilizables opcionales para contenedores generales
                '.contenedor-principal': {
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                },
            }}
        />
    );
}