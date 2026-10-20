package com.sedif.sistema_cafeteria.core.inventario;

import java.math.BigDecimal;

public record AjusteInventarioRequestRecord(
    BigDecimal nuevaCantidad,
    String motivoAjuste // Opcional, útil para auditoría
) {}