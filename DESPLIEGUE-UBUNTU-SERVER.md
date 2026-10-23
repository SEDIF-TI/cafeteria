# Guía de despliegue en Ubuntu Server

Guía paso a paso para **subir y poner en marcha un proyecto** (backend + frontend + base de
datos) en el servidor **Ubuntu Server** usando **Docker**. Está escrita para que la pueda
seguir cualquier persona, aunque no sea experta.

> **Ejemplo usado en esta guía:** proyecto **Cafetería SEDIF**.
> - Repositorio: `https://github.com/SEDIF-TI/cafeteria.git` (rama `InicioPruebas`)
> - Servidor (VM Ubuntu): IP `10.10.10.65`, usuario `sedif`
>
> Para **otro proyecto**, cambia el repositorio, la carpeta y los puertos; los pasos son los mismos.

> 🔐 **Sobre las contraseñas:** en esta guía **nunca** se escriben contraseñas reales.
> Donde veas `<AQUÍ VA ...>` debes poner el valor real (te lo da el administrador).
> Cuando un comando pida contraseña, simplemente escríbela (no se ve en pantalla, es normal).

---

## 0. Qué necesitas antes de empezar

- [ ] **Acceso al servidor Ubuntu**: su IP (ej. `10.10.10.65`), un usuario (ej. `sedif`) y su contraseña *(la da el administrador)*.
- [ ] **Un token de acceso de GitHub** para clonar el repositorio privado *(ver Paso 2.2)*.
- [ ] **Los secretos del proyecto** (contraseña de base de datos, clave JWT, correo) para armar el archivo `.env` *(los valores reales los da el administrador)*.
- [ ] Una computadora con **cliente SSH** (Windows 10/11 ya lo trae) en la misma red del servidor.

---

## 1. Preparar el servidor (SOLO la primera vez)

> Si el servidor **ya tiene Docker y git instalados**, salta al Paso 2.

### 1.1 Conectarse al servidor por SSH

Desde tu computadora, abre **PowerShell** (o la Terminal) y escribe:

```bash
ssh sedif@10.10.10.65
```

- La primera vez pregunta `Are you sure you want to continue connecting (yes/no)?` → escribe **`yes`**.
- Luego pedirá la **contraseña del usuario** `sedif` *(aquí va la contraseña del servidor)*.
- Si entras, verás algo como `sedif@docker-apps:~$`.

### 1.2 Instalar Docker

Ya dentro del servidor, pega estos comandos (uno por uno):

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

> El `sudo usermod -aG docker $USER` permite usar Docker **sin** escribir `sudo` cada vez.

Para que ese permiso tome efecto, **cierra la sesión y vuelve a entrar**:

```bash
exit
```
Y conéctate de nuevo:
```bash
ssh sedif@10.10.10.65
```

Verifica que Docker quedó bien:
```bash
docker --version
docker compose version
docker run hello-world
```
El último debe mostrar **"Hello from Docker!"**.

### 1.3 Instalar git

```bash
sudo apt update && sudo apt install -y git
```

### 1.4 Crear la red compartida del proxy (una sola vez)

Todos los proyectos comparten un **reverse proxy central** (Caddy). Para que se puedan
comunicar, crea la red compartida una única vez:

```bash
docker network create proxy-net
```

---

## 2. Descargar el proyecto (clonar del repositorio)

### 2.1 Entrar por SSH al servidor

Si no estás dentro, conéctate (Paso 1.1).

### 2.2 Crear un token de acceso de GitHub

Como el repositorio es **privado**, git pedirá un token en lugar de contraseña:

1. Entra a **github.com** → tu foto (arriba a la derecha) → **Settings**.
2. Hasta abajo: **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
3. Ponle un nombre (ej. `despliegue-servidor`), una expiración, y marca el permiso **`repo`**.
4. **Generate token** y **cópialo** (empieza con `ghp_...`). ⚠️ Solo se muestra una vez.

### 2.3 Clonar el repositorio

```bash
git clone https://github.com/SEDIF-TI/cafeteria.git
```

- **Username:** tu usuario de GitHub.
- **Password:** **pega el token** `ghp_...` *(aquí va el token; no se ve al pegar)*.

Entra a la carpeta y cámbiate a la rama correcta:

```bash
cd cafeteria
git checkout InicioPruebas
```

> Para otro proyecto, cambia la URL del repositorio y el nombre de la rama.

---

## 3. Configurar los secretos (archivo `.env`)

El archivo `.env` guarda las contraseñas y **no** viene en el repositorio (por seguridad).
Hay que crearlo en el servidor, dentro de la carpeta del proyecto.

### Opción A — Copiarlo desde otra computadora (recomendado)

Si ya tienes un `.env` válido en tu máquina, cópialo con `scp`. Desde **PowerShell de tu PC**
(no desde el SSH):

```powershell
scp -O "C:\ruta\a\tu\.env" sedif@10.10.10.65:~/cafeteria/.env
```

> El `-O` evita un error común de transferencia. Pedirá la contraseña del usuario del servidor.

### Opción B — Crearlo a mano en el servidor

Dentro del servidor:
```bash
cd ~/cafeteria
nano .env
```
Escribe el contenido (ajusta los valores reales donde dice `<AQUÍ VA ...>`):

```
# --- Base de datos ---
POSTGRES_DB=sistema_cafeteria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<AQUÍ VA LA CONTRASEÑA DE LA BASE DE DATOS>

# --- Seguridad / JWT ---
APP_JWT_SECRET=<AQUÍ VA LA CLAVE SECRETA JWT (texto largo y aleatorio)>
APP_JWT_EXPIRATION=3600000

# --- Correo (Gmail) ---
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<AQUÍ VA EL CORREO>
MAIL_PASSWORD=<AQUÍ VA LA CONTRASEÑA DE APLICACIÓN DE GMAIL (16 caracteres)>
```
Guarda con **Ctrl+O** → **Enter**, y sal con **Ctrl+X**.

> Las variables de la base dentro de Docker (host y puerto) las define `docker-compose.yml`
> automáticamente; no tienes que tocarlas en el `.env`.

---

## 4. Construir y levantar los contenedores

Dentro de la carpeta del proyecto en el servidor:

```bash
cd ~/cafeteria
docker compose up -d --build
```

- `--build` construye las imágenes del backend y frontend.
- **La primera vez tarda ~10–15 minutos** (descarga dependencias). Es normal, déjalo trabajar.
- `-d` lo deja corriendo en segundo plano.

> 💡 Para bajar imágenes base ya parcheadas (seguridad), puedes usar:
> ```bash
> docker compose build --pull
> docker compose up -d
> ```

---

## 5. Levantar el reverse proxy central (Caddy)

El proxy central es un stack aparte (carpeta `infra/proxy`). Se levanta una vez y queda
sirviendo a todos los proyectos:

```bash
cd ~/cafeteria/infra/proxy
docker compose up -d
```

> Enruta por **subdominio**. Mientras no haya dominio, sirve el proyecto por la IP en el
> puerto 80. Al agregar un proyecto nuevo, se añade un bloque en `infra/proxy/Caddyfile` y se
> reinicia el proxy (`docker compose up -d`).

---

## 6. (Si aplica) Cargar la base de datos

Al levantar por primera vez, la base queda **vacía** (sin usuarios ni datos). Hay dos caminos:

### 6.1 Empezar limpio
Crear los usuarios y datos desde cero dentro de la aplicación. *(Requiere un usuario
administrador inicial; pídelo al desarrollador si no existe.)*

### 6.2 Migrar datos desde otra base (respaldo)

**En la computadora de origen** (donde está la base con datos), genera un respaldo:
```bash
docker exec <contenedor-postgres> pg_dump -U postgres --clean --if-exists -f /tmp/respaldo.sql <nombre-base>
docker cp <contenedor-postgres>:/tmp/respaldo.sql "C:\ruta\respaldo.sql"
```

**Copia el respaldo al servidor** (desde PowerShell de tu PC):
```powershell
scp -O "C:\ruta\respaldo.sql" sedif@10.10.10.65:~/respaldo.sql
```

**En el servidor**, restaura:
```bash
cd ~/cafeteria
docker compose stop backend
docker exec -i postgres_cafeteria psql -U postgres -d sistema_cafeteria < ~/respaldo.sql
docker compose start backend
```
> Es normal ver avisos `NOTICE: ... does not exist, skipping` — **no son errores**.

Al terminar, **borra el respaldo** (tiene datos sensibles):
```bash
rm ~/respaldo.sql
```

---

## 7. Verificar que funciona

```bash
docker compose ps
```
Todos los servicios deben decir **Up**. Para ver si el backend arrancó bien:
```bash
docker compose logs backend --tail 40
```
Busca la línea **`Started ... Application in ... seconds`**.

Luego abre en el navegador (desde una PC de la misma red):
```
http://10.10.10.65
```
e inicia sesión. ✅

---

## 8. Acceso desde la red

- **Intranet (red interna):** se entra por la **IP del servidor** (ej. `http://10.10.10.65`).
  Funciona para todas las computadoras de la misma red.

- **Internet / datos móviles (acceso público):** lo configura el **área de Redes**.
  - Una IP pública puede tener varios sistemas; se diferencian por **puerto**.
  - Hay que pedir a Redes que **reenvíe (NAT) un puerto público libre** hacia
    `10.10.10.65`, puerto `80`.
  - Lo **ideal** a futuro es un **subdominio** (ej. `puntoventa.<zona>.gob.mx`): da una URL
    limpia y permite el **certificado SSL** (quita el aviso "No seguro").

- **Base de datos (DBeaver / respaldos):** desde la **intranet** se conecta a
  `IP-del-servidor` puerto `5437`. Desde **internet NO** es accesible (Redes solo reenvía el
  puerto web, no el de la base).

---

## 9. Actualizar un proyecto ya desplegado

Cuando haya cambios nuevos en el repositorio:

```bash
cd ~/cafeteria
git pull
docker compose up -d --build
```
> Si solo cambió configuración (no el código), puedes omitir `--build`.
> Si cambió el proxy, aplica también: `cd ~/cafeteria/infra/proxy && docker compose up -d`.

---

## 10. Respaldos de la base de datos

### Desde el servidor (manual)
```bash
cd ~/cafeteria
docker exec postgres_cafeteria pg_dump -U postgres --clean --if-exists sistema_cafeteria > ~/respaldo_$(date +%F).sql
```

### Desde otra PC de la intranet (sin entrar al servidor)
Con **DBeaver** u otra herramienta, conéctate a:
- Host: `10.10.10.65`
- Puerto: `5437`
- Base: `sistema_cafeteria`
- Usuario: `postgres`
- Contraseña: *(aquí va la contraseña de la base)*

Y usa su función de exportar/respaldar.

---

## 11. Problemas comunes y soluciones

| Problema | Solución |
|---|---|
| `scp` dice **"Connection closed"** | Usa `scp -O ...` (fuerza el protocolo clásico). |
| El contenedor no arranca | `docker compose logs <servicio> --tail 50` para ver el error. |
| "No puedo iniciar sesión" en una base recién creada | La base está vacía: hay que migrar datos o crear un usuario admin (Paso 6). |
| Cambié el `.env` y no toma efecto | Recrea los contenedores: `docker compose up -d`. |
| Puerto ocupado al levantar | Otro servicio usa ese puerto; cámbialo en `docker-compose.yml` o libéralo. |
| El proxy no encuentra el proyecto | Verifica que el proyecto esté en la red `proxy-net` y el nombre del contenedor en el Caddyfile. |
| Ver qué está corriendo | `docker compose ps` y `docker ps`. |

---

## 12. Pendientes de seguridad antes de producción

- [ ] Poner `app.errores.detallados=false` (para no exponer detalles de errores internos).
- [ ] Revisar si conviene **restringir el puerto de la base** (5437) a solo ciertas IP de la intranet.
- [ ] Cambiar las **contraseñas de prueba** de los usuarios.
- [ ] Activar **HTTPS/SSL** cuando Redes entregue el **subdominio**.
- [ ] Mantener las **imágenes base actualizadas** (`docker compose build --pull`) por seguridad.
- [ ] Configurar **respaldos automáticos** y **actualizaciones de seguridad** del sistema.

---

## Resumen rápido (chuleta)

```bash
# 1. Entrar al servidor
ssh sedif@10.10.10.65

# 2. (Primera vez) red compartida del proxy
docker network create proxy-net

# 3. Descargar el proyecto (primera vez)
git clone https://github.com/SEDIF-TI/cafeteria.git
cd cafeteria
git checkout InicioPruebas

# 4. Poner el .env (copiado o creado a mano)   [contiene contraseñas]

# 5. Levantar el proyecto
docker compose up -d --build

# 6. Levantar el proxy central (una vez)
cd infra/proxy && docker compose up -d && cd ../..

# 7. Verificar
docker compose ps
# Abrir http://10.10.10.65

# Actualizar más adelante:
git pull && docker compose up -d --build
```
