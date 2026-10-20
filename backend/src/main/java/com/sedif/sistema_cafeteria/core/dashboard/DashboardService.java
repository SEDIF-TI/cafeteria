package com.sedif.sistema_cafeteria.core.dashboard;

import com.sedif.sistema_cafeteria.core.cliente.ClienteRepository;
import com.sedif.sistema_cafeteria.core.dashboard.DashboardResponseRecord.*;
import com.sedif.sistema_cafeteria.core.inventario.Inventario;
import com.sedif.sistema_cafeteria.core.inventario.InventarioRepository;
import com.sedif.sistema_cafeteria.core.producto.Producto;
import com.sedif.sistema_cafeteria.core.producto.ProductoRepository;
import com.sedif.sistema_cafeteria.core.utensilio.EstadoPrestamo;
import com.sedif.sistema_cafeteria.core.utensilio.PrestamoUtensilio;
import com.sedif.sistema_cafeteria.core.utensilio.PrestamoUtensilioRepository;
import com.sedif.sistema_cafeteria.core.utensilio.UtensilioRepository;
import com.sedif.sistema_cafeteria.core.venta.DetalleVenta;
import com.sedif.sistema_cafeteria.core.venta.EstadoVenta;
import com.sedif.sistema_cafeteria.core.venta.Venta;
import com.sedif.sistema_cafeteria.core.venta.VentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Calcula los indicadores del dashboard. El volumen de una cafeteria es bajo,
 * por lo que se agrega en memoria a partir de una sola consulta por entidad.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Locale ES = Locale.forLanguageTag("es-MX");
    private static final Set<EstadoVenta> ANULADAS = EnumSet.of(EstadoVenta.CANCELADO);
    private static final Set<EstadoPrestamo> ABIERTOS = EnumSet.of(EstadoPrestamo.PRESTADO, EstadoPrestamo.DEVUELTO_PARCIAL);

    private final VentaRepository ventaRepository;
    private final InventarioRepository inventarioRepository;
    private final ProductoRepository productoRepository;
    private final UtensilioRepository utensilioRepository;
    private final PrestamoUtensilioRepository prestamoRepository;
    private final ClienteRepository clienteRepository;

    @Transactional(readOnly = true)
    public DashboardResponseRecord obtenerResumen(int dias) {
        int periodo = Math.max(1, Math.min(dias, 365));
        LocalDate hoy = LocalDate.now();
        LocalDateTime inicio = hoy.minusDays(periodo - 1L).atStartOfDay();
        LocalDateTime inicioAnterior = inicio.minusDays(periodo);

        List<Venta> todas = ventaRepository.findDesdeConDetalles(inicioAnterior).stream()
                .filter(v -> v.getAuditable() != null && v.getAuditable().getFechaCreacion() != null)
                .filter(v -> !ANULADAS.contains(v.getEstado()))
                .toList();
        List<Venta> ventas = todas.stream().filter(v -> !fecha(v).isBefore(inicio)).toList();
        List<Venta> anteriores = todas.stream().filter(v -> fecha(v).isBefore(inicio)).toList();
        List<Venta> deHoy = ventas.stream().filter(v -> fecha(v).toLocalDate().equals(hoy)).toList();

        // --- Productos: cantidad, ingreso y utilidad (precio - costo)
        Map<String, long[]> cantidades = new HashMap<>();
        Map<String, BigDecimal> ingresosProd = new HashMap<>();
        Map<String, BigDecimal> utilidadProd = new HashMap<>();
        Map<String, BigDecimal> porCategoria = new HashMap<>();
        Map<String, Long> cantCategoria = new HashMap<>();
        BigDecimal utilidadTotal = BigDecimal.ZERO;
        for (Venta v : ventas) {
            for (DetalleVenta d : v.getDetalles()) {
                Producto p = d.getProducto();
                String nombre = p != null ? p.getNombre() : "Desconocido";
                BigDecimal subtotal = nz(d.getSubtotal());
                BigDecimal costo = p != null ? nz(p.getCosto()).multiply(BigDecimal.valueOf(d.getCantidad())) : BigDecimal.ZERO;
                BigDecimal utilidad = subtotal.subtract(costo);
                cantidades.computeIfAbsent(nombre, k -> new long[1])[0] += d.getCantidad();
                ingresosProd.merge(nombre, subtotal, BigDecimal::add);
                utilidadProd.merge(nombre, utilidad, BigDecimal::add);
                utilidadTotal = utilidadTotal.add(utilidad);
                String categoria = p != null && p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin categoria";
                porCategoria.merge(categoria, subtotal, BigDecimal::add);
                cantCategoria.merge(categoria, (long) d.getCantidad(), Long::sum);
            }
        }
        List<ProductoTop> ranking = cantidades.entrySet().stream()
                .map(e -> new ProductoTop(e.getKey(), e.getValue()[0], ingresosProd.get(e.getKey()), utilidadProd.get(e.getKey())))
                .sorted(Comparator.comparingLong(ProductoTop::cantidad).reversed())
                .toList();

        // Productos activos sin ninguna venta en el periodo tambien cuentan como "menos vendidos"
        List<ProductoTop> menosVendidos = new ArrayList<>();
        productoRepository.findByActivoTrue().stream()
                .filter(p -> nz(p.getPrecio()).signum() > 0 && !cantidades.containsKey(p.getNombre()))
                .forEach(p -> menosVendidos.add(new ProductoTop(p.getNombre(), 0, BigDecimal.ZERO, BigDecimal.ZERO)));
        List<ProductoTop> asc = new ArrayList<>(ranking);
        Collections.reverse(asc);
        menosVendidos.addAll(asc);

        // --- Series de tiempo
        Map<LocalDate, List<Venta>> porDia = ventas.stream().collect(Collectors.groupingBy(v -> fecha(v).toLocalDate()));
        List<SerieFecha> serie = new ArrayList<>();
        for (int i = 0; i < periodo; i++) {
            LocalDate dia = inicio.toLocalDate().plusDays(i);
            List<Venta> lista = porDia.getOrDefault(dia, List.of());
            BigDecimal credito = suma(lista.stream().filter(v -> v.getEstado() == EstadoVenta.PENDIENTE).toList());
            serie.add(new SerieFecha(dia.toString(), suma(lista), lista.size(), credito));
        }

        List<Punto> porHora = agrupar(ventas, v -> String.format("%02d:00", fecha(v).getHour()));
        porHora = porHora.stream().sorted(Comparator.comparing(Punto::nombre)).toList();

        Map<DayOfWeek, List<Venta>> semana = ventas.stream().collect(Collectors.groupingBy(v -> fecha(v).getDayOfWeek()));
        List<Punto> porDiaSemana = Arrays.stream(DayOfWeek.values())
                .map(d -> new Punto(capitalizar(d.getDisplayName(TextStyle.FULL, ES)),
                        suma(semana.getOrDefault(d, List.of())), semana.getOrDefault(d, List.of()).size()))
                .toList();

        // --- Segmentaciones
        List<Punto> categorias = porCategoria.entrySet().stream()
                .map(e -> new Punto(e.getKey(), e.getValue(), cantCategoria.get(e.getKey())))
                .sorted(Comparator.comparing(Punto::valor).reversed()).toList();
        List<Punto> metodos = ordenar(agrupar(ventas, v -> v.getMetodoPago() != null ? v.getMetodoPago() : "N/D"));
        List<Punto> areas = ordenar(agrupar(ventas, v -> v.getCliente() != null && v.getCliente().getArea() != null
                ? v.getCliente().getArea() : "Publico general"));
        List<Punto> cajeros = ordenar(agrupar(ventas, v -> v.getUsuario() != null ? v.getUsuario().getNombre() : "N/D"));

        // --- Cartera vencida (todas las pendientes, sin importar el periodo)
        List<Venta> pendientes = ventaRepository.findByEstado(EstadoVenta.PENDIENTE);
        BigDecimal deuda = pendientes.stream().map(Venta::getSaldoPendiente).reduce(BigDecimal.ZERO, BigDecimal::add);
        long clientesConDeuda = pendientes.stream().filter(v -> v.getCliente() != null)
                .map(v -> v.getCliente().getPnId()).distinct().count();
        List<Punto> deudaArea = ordenarSaldo(pendientes, v -> v.getCliente() != null && v.getCliente().getArea() != null
                ? v.getCliente().getArea() : "Sin area");
        List<Punto> deudores = ordenarSaldo(pendientes, v -> v.getCliente() != null ? v.getCliente().getNombre() : "Sin cliente")
                .stream().limit(10).toList();

        // --- Inventario de insumos
        List<Insumo> criticos = inventarioRepository.findByActivoTrue().stream()
                .filter(i -> i.getStockMinimo() != null && nz(i.getStockActual()).compareTo(i.getStockMinimo()) <= 0)
                .sorted(Comparator.comparing(this::coberturaStock))
                .map(i -> new Insumo(i.getNombre(), nz(i.getStockActual()), i.getStockMinimo(),
                        i.getUnidadMedida() != null ? i.getUnidadMedida().name() : ""))
                .toList();

        // --- Utensilios
        List<UtensilioEstado> utensilios = utensilioRepository.findByActivoTrueOrderByNombreAsc().stream()
                .map(u -> new UtensilioEstado(u.getNombre(), u.getStockDisponible(),
                        u.getStockTotal() - u.getStockDisponible(), u.getStockTotal()))
                .toList();
        List<PrestamoUtensilio> abiertos = prestamoRepository.findByEstadoInOrderByFechaSalidaDesc(ABIERTOS);
        Map<String, long[]> fueraArea = new TreeMap<>();
        abiertos.forEach(p -> fueraArea.computeIfAbsent(p.getArea(), k -> new long[1])[0] +=
                p.getDetalles().stream().mapToInt(d -> d.pendiente()).sum());
        List<Punto> fueraPorArea = fueraArea.entrySet().stream()
                .map(e -> new Punto(e.getKey(), BigDecimal.valueOf(e.getValue()[0]), e.getValue()[0]))
                .sorted(Comparator.comparing(Punto::valor).reversed()).toList();
        long perdidos = prestamoRepository.findByEstadoInOrderByFechaSalidaDesc(EnumSet.of(EstadoPrestamo.PERDIDO)).stream()
                .filter(p -> p.getFechaDevolucion() != null && !p.getFechaDevolucion().isBefore(inicio))
                .mapToLong(p -> p.getDetalles().stream().mapToInt(d -> d.pendiente()).sum())
                .sum();

        BigDecimal ingresos = suma(ventas);
        Kpis kpis = new Kpis(
                ingresos,
                suma(deHoy),
                suma(anteriores),
                ventas.size(),
                deHoy.size(),
                ventas.isEmpty() ? BigDecimal.ZERO : ingresos.divide(BigDecimal.valueOf(ventas.size()), 2, RoundingMode.HALF_UP),
                utilidadTotal,
                ingresos.signum() == 0 ? BigDecimal.ZERO
                        : utilidadTotal.multiply(BigDecimal.valueOf(100)).divide(ingresos, 1, RoundingMode.HALF_UP),
                deuda,
                clientesConDeuda,
                criticos.size(),
                utensilios.stream().mapToLong(UtensilioEstado::fuera).sum(),
                abiertos.size(),
                perdidos,
                clienteRepository.count()
        );

        return new DashboardResponseRecord(periodo, kpis, serie, porHora, porDiaSemana,
                ranking.stream().limit(10).toList(), menosVendidos.stream().limit(10).toList(),
                categorias, metodos, areas, cajeros, deudaArea, deudores, criticos, utensilios, fueraPorArea);
    }

    // ---------------------------------------------------------------- Auxiliares

    private static LocalDateTime fecha(Venta v) {
        return v.getAuditable().getFechaCreacion();
    }

    private static BigDecimal nz(BigDecimal valor) {
        return valor != null ? valor : BigDecimal.ZERO;
    }

    private static BigDecimal suma(Collection<Venta> ventas) {
        return ventas.stream().map(v -> nz(v.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<Punto> agrupar(List<Venta> ventas, Function<Venta, String> clave) {
        return ventas.stream().collect(Collectors.groupingBy(clave)).entrySet().stream()
                .map(e -> new Punto(e.getKey(), suma(e.getValue()), e.getValue().size()))
                .toList();
    }

    private static List<Punto> ordenar(List<Punto> puntos) {
        return puntos.stream().sorted(Comparator.comparing(Punto::valor).reversed()).toList();
    }

    private static List<Punto> ordenarSaldo(List<Venta> ventas, Function<Venta, String> clave) {
        return ventas.stream().collect(Collectors.groupingBy(clave)).entrySet().stream()
                .map(e -> new Punto(e.getKey(),
                        e.getValue().stream().map(Venta::getSaldoPendiente).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().size()))
                .sorted(Comparator.comparing(Punto::valor).reversed())
                .toList();
    }

    /** Proporcion stock actual / minimo: cuanto menor, mas urgente reabastecer. */
    private BigDecimal coberturaStock(Inventario i) {
        if (i.getStockMinimo() == null || i.getStockMinimo().signum() == 0) {
            return BigDecimal.ONE;
        }
        return nz(i.getStockActual()).divide(i.getStockMinimo(), 4, RoundingMode.HALF_UP);
    }

    private static String capitalizar(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
