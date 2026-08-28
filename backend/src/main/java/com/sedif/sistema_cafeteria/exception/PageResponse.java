package com.sedif.sistema_cafeteria.exception;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Envoltorio de resultados paginados.
 *
 * <p>Se devuelve este record en lugar del {@code Page} de Spring Data porque
 * su serializacion JSON no es estable entre versiones y arrastra estructuras
 * internas ({@code pageable}, {@code sort}) que el cliente no necesita. Aqui el
 * contrato es explicito: solo los campos declarados, con nombres fijos.</p>
 *
 * @param contenido    elementos de la pagina actual.
 * @param pagina       indice de la pagina, empezando en 0.
 * @param tamano       elementos por pagina.
 * @param totalPaginas numero total de paginas disponibles.
 * @param totalItems   total de registros que cumplen el filtro.
 * @param esPrimera    indica si es la primera pagina.
 * @param esUltima     indica si es la ultima pagina.
 */
public record PageResponse<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        int totalPaginas,
        long totalItems,
        boolean esPrimera,
        boolean esUltima
) {

    /**
     * Construye la respuesta a partir de un {@link Page}, aplicando un mapeador
     * de entidad a DTO sobre su contenido y copiando los metadatos de
     * paginacion.
     *
     * <p>El mapeo se hace aqui para que ningun controlador devuelva entidades
     * JPA: al serializarse arrastran sus relaciones completas, con el
     * consiguiente riesgo de exponer datos ajenos al endpoint y de disparar
     * carga perezosa.</p>
     */
    public static <E, D> PageResponse<D> de(Page<E> page, Function<E, D> mapeador) {
        return new PageResponse<>(
                page.getContent().stream().map(mapeador).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.isFirst(),
                page.isLast()
        );
    }

    /**
     * Variante para paginas cuyo contenido ya es un DTO: reutiliza la anterior
     * con un mapeador identidad.
     */
    public static <T> PageResponse<T> de(Page<T> page) {
        return de(page, Function.identity());
    }
}
