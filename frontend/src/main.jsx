import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Importamos el tema que configuraste previamente
import { theme } from './theme/theme.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ThemeProvider inyecta los colores institucionales a todos los componentes */}
    <ThemeProvider theme={theme}>
      {/* CssBaseline normaliza los márgenes y aplica el color de fondo del tema */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);