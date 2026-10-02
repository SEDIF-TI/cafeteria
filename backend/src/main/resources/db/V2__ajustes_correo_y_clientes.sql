-- 1. Limpiar la tabla de usuario (Eliminar Telegram)
ALTER TABLE usuario DROP COLUMN IF EXISTS n_telegram_chat_id;

-- 2. Crear la tabla Cliente respetando la auditoría y prefijos del proyecto base
CREATE TABLE cliente (
    pn_id BIGSERIAL PRIMARY KEY,
    s_nombre VARCHAR(100) NOT NULL,
    s_telefono VARCHAR(20),
    s_email VARCHAR(100) UNIQUE, -- El nuevo campo vital para los correos
    b_activo BOOLEAN DEFAULT TRUE,
    
    -- Campos de auditoría JPA
    s_creado_por VARCHAR(100),
    d_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    s_modificado_por VARCHAR(100),
    d_fecha_modificacion TIMESTAMP
);

-- 3. Vincular la tabla de Ventas con el nuevo Cliente
-- Esto asegura la integridad relacional de la columna cliente_id que ya tienes creada
ALTER TABLE venta ADD CONSTRAINT fk_venta_cliente 
    FOREIGN KEY (cliente_id) REFERENCES cliente(pn_id);