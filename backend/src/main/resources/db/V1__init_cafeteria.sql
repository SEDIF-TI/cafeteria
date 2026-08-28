-- 1. Tabla Usuario
CREATE TABLE usuario (
    pn_id SERIAL PRIMARY KEY,
    s_username VARCHAR(50) UNIQUE NOT NULL,
    s_password VARCHAR(255) NOT NULL,
    s_rol VARCHAR(50) NOT NULL, -- SUPER_ADMINISTRADOR, ADMINISTRADOR, CAJERO
    b_activo BOOLEAN DEFAULT TRUE
);

-- 2. Tabla Cliente
CREATE TABLE cliente (
    pn_id SERIAL PRIMARY KEY,
    s_nombre VARCHAR(100) NOT NULL,
    s_telefono VARCHAR(20),
    n_telegram_chat_id BIGINT UNIQUE,
    d_fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Producto
CREATE TABLE producto (
    pn_id SERIAL PRIMARY KEY,
    s_nombre VARCHAR(100) NOT NULL,
    s_descripcion TEXT,
    n_precio DECIMAL(10, 2) NOT NULL,
    b_activo BOOLEAN DEFAULT TRUE
);

-- 4. Tabla Venta
CREATE TABLE venta (
    pn_id SERIAL PRIMARY KEY,
    n_id_cajero INTEGER REFERENCES usuario(pn_id),
    n_id_cliente INTEGER REFERENCES cliente(pn_id), 
    n_total DECIMAL(10, 2) NOT NULL,
    s_estado VARCHAR(20) NOT NULL, -- 'PAGADA' o 'PENDIENTE'
    d_fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Venta Detalle
CREATE TABLE venta_detalle (
    pn_id SERIAL PRIMARY KEY,
    n_id_venta INTEGER REFERENCES venta(pn_id),
    n_id_producto INTEGER REFERENCES producto(pn_id),
    n_cantidad INTEGER NOT NULL,
    n_precio_unitario DECIMAL(10, 2) NOT NULL,
    n_subtotal DECIMAL(10, 2) NOT NULL
);

-- 6. Tabla Deuda
CREATE TABLE deuda (
    pn_id SERIAL PRIMARY KEY,
    n_id_venta INTEGER REFERENCES venta(pn_id) UNIQUE,
    n_id_cliente INTEGER REFERENCES cliente(pn_id),
    n_monto_pendiente DECIMAL(10, 2) NOT NULL,
    d_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    d_fecha_liquidacion TIMESTAMP,
    s_estado VARCHAR(20) NOT NULL -- 'ACTIVA', 'LIQUIDADA'
);