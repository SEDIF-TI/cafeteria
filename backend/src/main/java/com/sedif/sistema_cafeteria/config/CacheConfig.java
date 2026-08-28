package com.sedif.sistema_cafeteria.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cache en memoria para los catalogos que casi nunca cambian.
 *
 * <p>Roles, areas, estatus y vistas se consultan en practicamente cada
 * peticion (el filtro JWT resuelve el rol, el menu lee las vistas) pero se
 * modifican muy de vez en cuando. Cachearlos evita ir a la base de datos una
 * y otra vez por los mismos registros.</p>
 *
 * <p>Se usa {@link ConcurrentMapCacheManager}: guarda las entradas en el
 * espacio de memoria del proceso, sin caducidad por tiempo ni limite de tamano,
 * lo que resulta suficiente para catalogos pequenos en un despliegue de una
 * sola instancia y no anade dependencias. Una cache distribuida como Redis
 * seria necesaria si la aplicacion se replicara en varias instancias, para que
 * todas compartieran la misma copia.</p>
 *
 * <p>Al no haber caducidad, la frescura depende por completo de la
 * invalidacion: los servicios que modifican estos catalogos lo hacen con
 * {@code @CacheEvict}. Ningun dato de ticket ni de usuario se cachea, para no
 * servir informacion obsoleta ni retener datos personales en memoria mas alla
 * de la peticion.</p>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    // Nombres de las regiones de cache. Los servicios los referencian desde
    // aqui para que @Cacheable y @CacheEvict no puedan discrepar por una errata.
    public static final String CACHE_ROLES = "roles";
    public static final String CACHE_AREAS = "areas";
    public static final String CACHE_VISTAS = "vistas";

    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                CACHE_ROLES,
                CACHE_AREAS,
                CACHE_VISTAS
        );
    }
}
