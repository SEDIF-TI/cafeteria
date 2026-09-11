package com.sedif.sistema_cafeteria.core.categoria;

import com.sedif.sistema_cafeteria.core.categoria.CategoriaRepository;
import com.sedif.sistema_cafeteria.core.categoria.CategoriaResponseRecord;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;

    @Transactional
    public CategoriaResponseRecord crearCategoria(CategoriaRequestRecord request) {
        // Opcional: Validar si el nombre ya existe
        if (categoriaRepository.findByNombre(request.nombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una categoría con ese nombre");
        }

        Categoria categoria = Categoria.builder()
                .nombre(request.nombre())
                .descripcion(request.descripcion())
                .build();

        Categoria categoriaGuardada = categoriaRepository.save(categoria);
        return new CategoriaResponseRecord(categoriaGuardada);
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponseRecord> obtenerTodas() {
        return categoriaRepository.findAll().stream()
                .map(CategoriaResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponseRecord> obtenerActivas() {
        return categoriaRepository.findByActivoTrue().stream()
                .map(CategoriaResponseRecord::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoriaResponseRecord obtenerPorId(Long id) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + id));
        return new CategoriaResponseRecord(categoria);
    }

    @Transactional
    public CategoriaResponseRecord actualizarCategoria(Long id, CategoriaRequestRecord request) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + id));

        categoria.setNombre(request.nombre());
        categoria.setDescripcion(request.descripcion());

        return new CategoriaResponseRecord(categoriaRepository.save(categoria));
    }

    @Transactional
    public void alternarEstado(Long id) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Categoría no encontrada con id: " + id));
        
        // Borrado lógico / Alternar estado activo-inactivo
        categoria.setActivo(!categoria.getActivo());
        categoriaRepository.save(categoria);
    }
}