# ===========================================================================
# Backend (Spring Boot 4 / Java 17) - imagen multietapa
# ===========================================================================

# ---- Etapa 1: compilacion con Maven ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Primero el pom para cachear la descarga de dependencias
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
# Luego el codigo y el empaquetado (sin tests para una build mas rapida)
COPY src ./src
RUN mvn -B -ntp clean package -DskipTests

# ---- Etapa 2: ejecucion (imagen ligera, solo el JRE) ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
# Usuario sin privilegios por seguridad
RUN useradd -r -u 1001 spring
# El jar generado (sistema_cafeteria-0.0.1-SNAPSHOT.jar)
COPY --from=build /app/target/*.jar app.jar
USER spring
EXPOSE 8080
# JAVA_OPTS permite ajustar memoria desde el compose/VM sin tocar la imagen
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
