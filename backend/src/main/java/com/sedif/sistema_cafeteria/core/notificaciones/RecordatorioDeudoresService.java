package com.sedif.sistema_cafeteria.core.notificaciones;

import com.sedif.sistema_cafeteria.core.venta.Venta;
import com.sedif.sistema_cafeteria.core.venta.VentaRepository;
import com.sedif.sistema_cafeteria.core.venta.EstadoVenta;
import com.sedif.sistema_cafeteria.core.cliente.Cliente;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordatorioDeudoresService {

    private final VentaRepository ventaRepository;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 10 15,L * ?")
    @Transactional(readOnly = true)
    public void notificarCuentasPendientes() {
        
        // 1. Obtener todas las ventas pendientes
        List<Venta> deudas = ventaRepository.findAll().stream()
                .filter(v -> v.getEstado() == EstadoVenta.PENDIENTE && v.getCliente() != null)
                .toList();

        // 2. Agruparlas por cliente para no enviar spam
        Map<Cliente, List<Venta>> deudasPorCliente = deudas.stream()
                .collect(Collectors.groupingBy(Venta::getCliente));

        // 3. Procesar y enviar
        deudasPorCliente.forEach((cliente, tickets) -> {
            
            // CORRECCIÓN: Se usa getCorreoElectronico() en lugar de getEmail()
            if (cliente.getCorreoElectronico() != null && !cliente.getCorreoElectronico().isEmpty()) {
                
                BigDecimal totalAdeudo = tickets.stream()
                        .map(Venta::getTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                String mensaje = String.format(
                        "☕ *Hola %s, tu cafetería te saluda*\n\n" +
                        "Te recordamos amigablemente que tienes un saldo pendiente de *$%s* " +
                        "correspondiente a %d ticket(s).\n\n" +
                        "¡Te esperamos pronto para poner tu cuenta al corriente!",
                        cliente.getNombre(), totalAdeudo, tickets.size()
                );

                try {
                    // CORRECCIÓN: Se usa enviarCorreo() y getCorreoElectronico()
                    emailService.enviarCorreo(cliente.getCorreoElectronico(), "Recordatorio de Deuda", mensaje);
                } catch (Exception e) {
                    System.err.println("Fallo al enviar a " + cliente.getNombre() + ": " + e.getMessage());
                }
            }
        });
    }
}