package com.sedif.sistema_cafeteria.core.inventario;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventarioService {

    private final InventarioRepository inventarioRepository;

    @Transactional
    public InventarioResponseRecord crearInventario(InventarioRequestRecord request) {
        if (inventarioRepository.findByNombre(request.nombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un registro de inventario con ese nombre");
        }

        Inventario inventario = Inventario.builder()
                .nombre(request.nombre())
                .unidadMedida(request.unidadMedida())
                .stockActual(request.stockActual())
                .stockMinimo(request.stockMinimo())
                .build();

        return new InventarioResponseRecord(inventarioRepository.save(inventario));
    }

    @Transactional(readOnly = true)
    public List<InventarioResponseRecord> obtenerTodos() {
        return inventarioRepository.findAll().stream()
                .map(InventarioResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InventarioResponseRecord> obtenerActivos() {
        return inventarioRepository.findByActivoTrue().stream()
                .map(InventarioResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public InventarioResponseRecord obtenerPorId(Long id) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Registro de inventario no encontrado con id: " + id));
        return new InventarioResponseRecord(inventario);
    }

    @Transactional
    public InventarioResponseRecord actualizarInventario(Long id, InventarioRequestRecord request) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Registro de inventario no encontrado con id: " + id));

        inventario.setNombre(request.nombre());
        inventario.setUnidadMedida(request.unidadMedida());
        inventario.setStockActual(request.stockActual());
        inventario.setStockMinimo(request.stockMinimo());

        return new InventarioResponseRecord(inventarioRepository.save(inventario));
    }

    @Transactional
    public void alternarEstado(Long id) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Registro de inventario no encontrado con id: " + id));
        
        inventario.setActivo(!inventario.getActivo());
        inventarioRepository.save(inventario);
    }
}