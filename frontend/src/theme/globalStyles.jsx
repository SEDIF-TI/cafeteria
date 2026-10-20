import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

export default function GlobalStyles() {
    return (
        <MuiGlobalStyles
            styles={{
                // Reset agresivo para que ocupe toda la pantalla
                'html, body, #root': {
                    margin: 0,
                    padding: 0,
                    width: '100%',
                    maxWidth: 'none !important', // Rompe cualquier límite de Vite
                    minHeight: '100vh',
                    backgroundColor: '#f4f6f8',
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                },
                '.contenedor-principal': {
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                },
            }}
        />
    );
}