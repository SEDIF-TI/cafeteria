package com.sedif.sistema_cafeteria.core.cliente;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClienteResetTokenRepository extends JpaRepository<ClienteResetToken, Long> {

    /** Codigo mas reciente sin usar, para validar en la confirmacion. */
    Optional<ClienteResetToken> findFirstByClientePnIdAndUsadoFalseOrderByIdDesc(Long clienteId);

    /** Codigos sin usar del cliente: se invalidan al emitir uno nuevo. */
    List<ClienteResetToken> findByClientePnIdAndUsadoFalse(Long clienteId);
}
