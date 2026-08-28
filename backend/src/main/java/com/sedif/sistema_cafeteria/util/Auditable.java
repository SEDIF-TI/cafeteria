package com.sedif.sistema_cafeteria.util;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import java.time.LocalDateTime;

@Embeddable
public class Auditable {

    @CreatedDate
    @Column(name = "d_fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @LastModifiedDate
    @Column(name = "d_fecha_modificacion")
    private LocalDateTime fechaModificacion;

    @CreatedBy
    @Column(name = "s_creado_por", updatable = false, length = 100)
    private String creadoPor;

    @LastModifiedBy
    @Column(name = "s_modificado_por", length = 100)
    private String modificadoPor;

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaModificacion() { return fechaModificacion; }
    public void setFechaModificacion(LocalDateTime fechaModificacion) { this.fechaModificacion = fechaModificacion; }

    public String getCreadoPor() { return creadoPor; }
    public void setCreadoPor(String creadoPor) { this.creadoPor = creadoPor; }

    public String getModificadoPor() { return modificadoPor; }
    public void setModificadoPor(String modificadoPor) { this.modificadoPor = modificadoPor; }
}