// src/components/PieDePagina.jsx
import { Box, Typography } from '@mui/material';

export default function PieDePagina() {
    return (
        <Box component="footer" sx={{ py: 3, textAlign: 'center', mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
                Sistema SEDIF - Sistema_Cafeteria © {new Date().getFullYear()}
            </Typography>
        </Box>
    );
}