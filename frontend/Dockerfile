# ===========================================================================
# Frontend (React + Vite) - build estatico servido por nginx
# ===========================================================================

# ---- Etapa 1: compilacion del frontend ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# No se define VITE_API_URL: la app llama a /api/v1 (relativo) y nginx lo
# reenvia al backend. Asi la misma imagen sirve en cualquier servidor.
RUN npm run build

# ---- Etapa 2: servir con nginx ----
FROM nginx:alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
