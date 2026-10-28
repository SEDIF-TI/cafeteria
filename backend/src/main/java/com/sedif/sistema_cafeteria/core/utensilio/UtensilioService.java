package com.sedif.sistema_cafeteria.core.utensilio;

import com.sedif.sistema_cafeteria.core.cliente.Cliente;
import com.sedif.sistema_cafeteria.core.cliente.ClienteRepository;
import com.sedif.sistema_cafeteria.core.venta.Venta;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UtensilioService {

    private final UtensilioRepository utensilioRepository;
    private final PrestamoUtensilioRepository prestamoRepository;
    private final ClienteRepository clienteRepository;

    // ---------------------------------------------------------------- Catalogo

    @Transactional
    public UtensilioResponseRecord crear(UtensilioRequestRecord request) {
        String nombre = request.nombre().trim();
        if (utensilioRepository.existsByNombreIgnoreCase(nombre)) {
            throw new IllegalArgumentException("Ya existe un utensilio con el nombre: " + nombre);
        }
        Utensilio utensilio = Utensilio.builder()
                .nombre(nombre)
                .stockTotal(request.stockTotal())
                .stockDisponible(request.stockTotal())
                .build();
        return new UtensilioResponseRecord(utensilioRepository.save(utensilio));
    }

    @Transactional
    public UtensilioResponseRecord actualizar(Long id, UtensilioRequestRecord request) {
        Utensilio utensilio = buscarUtensilio(id);
        String nombre = request.nombre().trim();
        if (!utensilio.getNombre().equalsIgnoreCase(nombre) && utensilioRepository.existsByNombreIgnoreCase(nombre)) {
            throw new IllegalArgumentException("Ya existe un utensilio con el nombre: " + nombre);
        }
        int enPrestamo = utensilio.getStockTotal() - utensilio.getStockDisponible();
        if (request.stockTotal() < enPrestamo) {
            throw new IllegalArgumentException("El stock total no puede ser menor a las piezas prestadas (" + enPrestamo + ").");
        }
        utensilio.setNombre(nombre);
        utensilio.setStockTotal(request.stockTotal());
        utensilio.setStockDisponible(request.stockTotal() - enPrestamo);
        return new UtensilioResponseRecord(utensilioRepository.save(utensilio));
    }

    @Transactional
    public void cambiarEstado(Long id) {
        Utensilio utensilio = buscarUtensilio(id);
        utensilio.setActivo(!Boolean.TRUE.equals(utensilio.getActivo()));
        utensilioRepository.save(utensilio);
    }

    @Transactional(readOnly = true)
    public List<UtensilioResponseRecord> listar(boolean soloActivos) {
        List<Utensilio> lista = soloActivos
                ? utensilioRepository.findByActivoTrueOrderByNombreAsc()
                : utensilioRepository.findAllByOrderByNombreAsc();
        return lista.stream().map(UtensilioResponseRecord::new).toList();
    }

    // ---------------------------------------------------------------- Prestamos

    /**
     * Registra la salida de utensilios. Se invoca desde la venta (dentro de su
     * transaccion) solo cuando el cajero activa "se lleva cubiertos".
     */
    @Transactional
    public PrestamoUtensilio registrarPrestamo(PrestamoUtensilioRequestRecord request, Venta venta, Cliente cliente) {
        String codigo = request.codigoEmpleado() != null ? request.codigoEmpleado().trim() : "";

        // Si la venta no trae cliente, se intenta identificar al empleado por su numero de control
        Cliente empleado = cliente != null ? cliente
                : (!codigo.isBlank() ? clienteRepository.findFirstByNumeroControlEmpleado(codigo).orElse(null) : null);

        // Area: la indicada, o la del empleado; si no hay ninguna (publico general sin area) -> "Sin area"
        String area = request.area() != null && !request.area().isBlank() ? request.area().trim()
                : (empleado != null ? empleado.getArea() : null);
        if (area == null || area.isBlank()) {
            area = "Sin area";
        }

        // Nombre/referencia: el del empleado, o el capturado a mano (publico general)
        String nombreRef = empleado != null ? empleado.getNombre()
                : (request.nombre() != null && !request.nombre().isBlank() ? request.nombre().trim() : null);

        PrestamoUtensilio prestamo = PrestamoUtensilio.builder()
                .venta(venta)
                .cliente(empleado)
                .codigoEmpleado(codigo)
                .nombreEmpleado(nombreRef)
                .area(area)
                .observaciones(request.observaciones())
                .fechaSalida(LocalDateTime.now())
                .estado(EstadoPrestamo.PRESTADO)
                .build();

        // Normalmente el frontend solo manda las banderas del kit; aqui se arma.
        // Si viniera una lista explicita de utensilios, esa tiene prioridad.
        int juegos = request.juegos() != null && request.juegos() > 0 ? request.juegos() : 1;
        List<ItemUtensilioRequestRecord> items = (request.utensilios() != null && !request.utensilios().isEmpty())
                ? request.utensilios()
                : construirKit(juegos, Boolean.TRUE.equals(request.incluyeCharola()));

        // Agrupa por utensilio por si el mismo viene repetido en la lista
        Map<Long, Integer> cantidades = items.stream()
                .collect(Collectors.toMap(ItemUtensilioRequestRecord::utensilioId,
                        ItemUtensilioRequestRecord::cantidad, Integer::sum));

        cantidades.forEach((utensilioId, cantidad) -> {
            Utensilio utensilio = buscarUtensilio(utensilioId);
            if (!Boolean.TRUE.equals(utensilio.getActivo())) {
                throw new IllegalArgumentException("El utensilio '" + utensilio.getNombre() + "' esta inactivo.");
            }
            if (utensilio.getStockDisponible() < cantidad) {
                throw new IllegalArgumentException("No hay suficientes '" + utensilio.getNombre()
                        + "' disponibles. Disponibles: " + utensilio.getStockDisponible());
            }
            utensilio.setStockDisponible(utensilio.getStockDisponible() - cantidad);
            prestamo.getDetalles().add(PrestamoUtensilioDetalle.builder()
                    .prestamo(prestamo)
                    .utensilio(utensilio)
                    .cantidad(cantidad)
                    .build());
        });

        return prestamoRepository.save(prestamo);
    }

    @Transactional
    public PrestamoUtensilioResponseRecord crearPrestamo(PrestamoUtensilioRequestRecord request) {
        return new PrestamoUtensilioResponseRecord(registrarPrestamo(request, null, null));
    }

    @Transactional
    public PrestamoUtensilioResponseRecord devolver(Long id, DevolucionUtensilioRequestRecord request) {
        PrestamoUtensilio prestamo = buscarPrestamo(id);
        validarAbierto(prestamo);

        boolean devolverTodo = request == null || request.items() == null || request.items().isEmpty();
        Map<Long, Integer> solicitadas = devolverTodo ? Map.of()
                : request.items().stream().collect(Collectors.toMap(ItemUtensilioRequestRecord::utensilioId,
                        ItemUtensilioRequestRecord::cantidad, Integer::sum));

        Map<Long, PrestamoUtensilioDetalle> porUtensilio = prestamo.getDetalles().stream()
                .collect(Collectors.toMap(d -> d.getUtensilio().getId(), Function.identity()));
        for (Long utensilioId : solicitadas.keySet()) {
            if (!porUtensilio.containsKey(utensilioId)) {
                throw new IllegalArgumentException("El utensilio con id " + utensilioId + " no forma parte de este prestamo.");
            }
        }

        for (PrestamoUtensilioDetalle detalle : prestamo.getDetalles()) {
            int pendiente = detalle.pendiente();
            int aDevolver = devolverTodo ? pendiente
                    : solicitadas.getOrDefault(detalle.getUtensilio().getId(), 0);
            if (aDevolver > pendiente) {
                throw new IllegalArgumentException("Se intenta devolver mas '" + detalle.getUtensilio().getNombre()
                        + "' de los pendientes (" + pendiente + ").");
            }
            detalle.setCantidadDevuelta(detalle.getCantidadDevuelta() + aDevolver);
            Utensilio utensilio = detalle.getUtensilio();
            utensilio.setStockDisponible(utensilio.getStockDisponible() + aDevolver);
        }

        boolean completo = prestamo.getDetalles().stream().allMatch(d -> d.pendiente() == 0);
        prestamo.setEstado(completo ? EstadoPrestamo.DEVUELTO : EstadoPrestamo.DEVUELTO_PARCIAL);
        if (completo) {
            prestamo.setFechaDevolucion(LocalDateTime.now());
        }
        agregarObservacion(prestamo, request != null ? request.observaciones() : null);
        return new PrestamoUtensilioResponseRecord(prestamoRepository.save(prestamo));
    }

    /** Marca como perdidas las piezas pendientes: se descuentan del stock total. */
    @Transactional
    public PrestamoUtensilioResponseRecord marcarPerdido(Long id, String observaciones) {
        PrestamoUtensilio prestamo = buscarPrestamo(id);
        validarAbierto(prestamo);
        for (PrestamoUtensilioDetalle detalle : prestamo.getDetalles()) {
            Utensilio utensilio = detalle.getUtensilio();
            utensilio.setStockTotal(utensilio.getStockTotal() - detalle.pendiente());
        }
        prestamo.setEstado(EstadoPrestamo.PERDIDO);
        prestamo.setFechaDevolucion(LocalDateTime.now());
        agregarObservacion(prestamo, observaciones);
        return new PrestamoUtensilioResponseRecord(prestamoRepository.save(prestamo));
    }

    @Transactional(readOnly = true)
    public List<PrestamoUtensilioResponseRecord> listarPrestamos(boolean soloAbiertos) {
        List<PrestamoUtensilio> lista = soloAbiertos
                ? prestamoRepository.findByEstadoInOrderByFechaSalidaDesc(
                        EnumSet.of(EstadoPrestamo.PRESTADO, EstadoPrestamo.DEVUELTO_PARCIAL))
                : prestamoRepository.findAllByOrderByFechaSalidaDesc();
        return lista.stream().map(PrestamoUtensilioResponseRecord::new).toList();
    }

    @Transactional(readOnly = true)
    public List<PrestamoUtensilioResponseRecord> listarPorEmpleado(String codigoEmpleado) {
        return prestamoRepository.findByCodigoEmpleadoOrderByFechaSalidaDesc(codigoEmpleado.trim()).stream()
                .map(PrestamoUtensilioResponseRecord::new)
                .toList();
    }

    // ---------------------------------------------------------------- Auxiliares

    /** Arma el kit estandar que se entrega con cada comida: N juegos de cada pieza base (+ charola). */
    private List<ItemUtensilioRequestRecord> construirKit(int juegos, boolean incluyeCharola) {
        List<String> nombres = new ArrayList<>(SeedUtensiliosEstandar.KIT_BASE);
        if (incluyeCharola) {
            nombres.add(SeedUtensiliosEstandar.CHAROLA);
        }
        List<ItemUtensilioRequestRecord> items = new ArrayList<>();
        for (String nombre : nombres) {
            Utensilio u = utensilioRepository.findByNombreIgnoreCase(nombre)
                    .orElseThrow(() -> new IllegalStateException(
                            "Falta el utensilio estandar '" + nombre + "'. Reinicia el backend para recrearlo."));
            items.add(new ItemUtensilioRequestRecord(u.getId(), juegos));
        }
        return items;
    }

    private Utensilio buscarUtensilio(Long id) {
        return utensilioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utensilio no encontrado con id: " + id));
    }

    private PrestamoUtensilio buscarPrestamo(Long id) {
        return prestamoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Prestamo de utensilios no encontrado con id: " + id));
    }

    private static void validarAbierto(PrestamoUtensilio prestamo) {
        if (prestamo.getEstado() == EstadoPrestamo.DEVUELTO || prestamo.getEstado() == EstadoPrestamo.PERDIDO) {
            throw new IllegalStateException("El prestamo ya fue cerrado (" + prestamo.getEstado() + ").");
        }
    }

    private static void agregarObservacion(PrestamoUtensilio prestamo, String observacion) {
        if (observacion == null || observacion.isBlank()) {
            return;
        }
        String previa = prestamo.getObservaciones();
        String nueva = (previa == null || previa.isBlank()) ? observacion.trim() : previa + " | " + observacion.trim();
        prestamo.setObservaciones(nueva.length() > 500 ? nueva.substring(0, 500) : nueva);
    }
}
