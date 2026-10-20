package com.sedif.sistema_cafeteria.core.utensilio;

public record UtensilioResponseRecord(
        Long id,
        String nombre,
        Integer stockTotal,
        Integer stockDisponible,
        Integer enPrestamo,
        Boolean activo
) {
    public UtensilioResponseRecord(Utensilio u) {
        this(u.getId(), u.getNombre(), u.getStockTotal(), u.getStockDisponible(),
                u.getStockTotal() - u.getStockDisponible(), u.getActivo());
    }
}
