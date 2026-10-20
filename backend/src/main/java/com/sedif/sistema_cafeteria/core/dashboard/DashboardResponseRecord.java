package com.sedif.sistema_cafeteria.core.dashboard;

import java.math.BigDecimal;
import java.util.List;

/** Indicadores y series para el tablero de toma de decisiones. */
public record DashboardResponseRecord(
        int dias,
        Kpis kpis,
        List<SerieFecha> ventasPorDia,
        List<Punto> ventasPorHora,
        List<Punto> ventasPorDiaSemana,
        List<ProductoTop> topProductos,
        List<ProductoTop> productosMenosVendidos,
        List<Punto> ingresosPorCategoria,
        List<Punto> metodosPago,
        List<Punto> ventasPorArea,
        List<Punto> ventasPorCajero,
        List<Punto> deudaPorArea,
        List<Punto> topDeudores,
        List<Insumo> insumosCriticos,
        List<UtensilioEstado> utensilios,
        List<Punto> cubiertosFueraPorArea
) {
    public record Kpis(
            BigDecimal ingresosPeriodo,
            BigDecimal ingresosHoy,
            BigDecimal ingresosPeriodoAnterior,
            long ventasPeriodo,
            long ventasHoy,
            BigDecimal ticketPromedio,
            BigDecimal utilidadEstimada,
            BigDecimal margenPorcentaje,
            BigDecimal deudaPendiente,
            long clientesConDeuda,
            long insumosBajoMinimo,
            long cubiertosFuera,
            long prestamosAbiertos,
            long cubiertosPerdidosPeriodo,
            long clientesRegistrados
    ) {}

    /** Punto generico nombre / valor (valor = dinero o conteo) con un valor secundario opcional. */
    public record Punto(String nombre, BigDecimal valor, long cantidad) {}

    public record SerieFecha(String fecha, BigDecimal ingresos, long ventas, BigDecimal credito) {}

    public record ProductoTop(String nombre, long cantidad, BigDecimal ingresos, BigDecimal utilidad) {}

    public record Insumo(String nombre, BigDecimal stockActual, BigDecimal stockMinimo, String unidad) {}

    public record UtensilioEstado(String nombre, int disponibles, int fuera, int total) {}
}
