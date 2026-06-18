-- CEAC CRM Financiaciones — Schema v1.3
-- PostgreSQL 16

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'agente', -- agente, supervisor, admin
  sede VARCHAR(50), -- Madrid, Barcelona, Valencia
  activo BOOLEAN DEFAULT true,
  force_change BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alumnos (
  id SERIAL PRIMARY KEY,
  sf_opportunity_id VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150),
  email VARCHAR(150),
  telefono VARCHAR(20),
  telefono2 VARCHAR(20),
  sede VARCHAR(50),
  curso VARCHAR(200),
  modalidad VARCHAR(50), -- Presencial, Distancia, B-Learning
  estado VARCHAR(50) DEFAULT 'pendiente_llamar',
  -- pendiente_llamar, no_localizable, llamado, interesado, en_proceso_sabadell, convertido, rechazado_banco, rechazado_alumno
  importe_total_recibos DECIMAL(10,2),
  importe_reserva DECIMAL(10,2),
  importe_financiado DECIMAL(10,2),
  importe_oferta DECIMAL(10,2) GENERATED ALWAYS AS (GREATEST(importe_financiado - 150, 0)) STORED,
  doc_mgr_status VARCHAR(20), -- Green, Yellow, Orange, Blue, Grey, Red
  asignado_a INTEGER REFERENCES usuarios(id),
  ultimo_comentario TEXT,
  fecha_ultimo_contacto TIMESTAMPTZ,
  fecha_conversion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llamadas (
  id SERIAL PRIMARY KEY,
  alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  duracion_segundos INTEGER,
  resultado VARCHAR(50), -- no_contesta, buzon, hablo, cita_programada
  comentario TEXT,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS documentacion (
  id SERIAL PRIMARY KEY,
  alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo VARCHAR(100) NOT NULL, -- DNI, nomina, extracto_bancario, contrato, etc
  recibido BOOLEAN DEFAULT false,
  fecha_recepcion TIMESTAMPTZ,
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumnos_estado ON alumnos(estado);
CREATE INDEX IF NOT EXISTS idx_alumnos_sede ON alumnos(sede);
CREATE INDEX IF NOT EXISTS idx_alumnos_asignado ON alumnos(asignado_a);
CREATE INDEX IF NOT EXISTS idx_llamadas_alumno ON llamadas(alumno_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alumnos_updated_at
  BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed: usuario admin
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Admin', 'admin@ceac.es', '$2b$10$placeholder_change_on_first_login', 'admin')
ON CONFLICT (email) DO NOTHING;
