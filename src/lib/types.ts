// CEAC CRM Financiaciones — TypeScript Types
// Matches sql/01_schema.sql v1.3

export type Rol = 'agente' | 'supervisor' | 'admin'
export type Sede = 'Madrid' | 'Barcelona' | 'Valencia'
export type Modalidad = 'Presencial' | 'Distancia' | 'B-Learning'
export type DocMgrStatus = 'Green' | 'Yellow' | 'Orange' | 'Blue' | 'Grey' | 'Red'

export type EstadoAlumno =
  | 'pendiente_llamar'
  | 'no_localizable'
  | 'llamado'
  | 'interesado'
  | 'en_proceso_sabadell'
  | 'convertido'
  | 'rechazado_banco'
  | 'rechazado_alumno'

export type ResultadoLlamada =
  | 'no_contesta'
  | 'buzon'
  | 'hablo'
  | 'cita_programada'

export interface Usuario {
  id: number
  nombre: string
  email: string
  password_hash?: string
  rol: Rol
  sede: Sede | null
  activo: boolean
  force_change: boolean
  created_at: string
}

export interface Alumno {
  id: number
  sf_opportunity_id: string
  nombre: string
  apellidos: string | null
  email: string | null
  telefono: string | null
  telefono2: string | null
  sede: Sede | null
  curso: string | null
  modalidad: Modalidad | null
  estado: EstadoAlumno
  importe_total_recibos: number | null
  importe_reserva: number | null
  importe_financiado: number | null
  importe_oferta: number | null   // calculado en BD: importe_financiado - 150
  doc_mgr_status: DocMgrStatus | null
  asignado_a: number | null
  ultimo_comentario: string | null
  observaciones: string | null
  sf_order_id: string | null
  fecha_ultimo_contacto: string | null
  fecha_conversion: string | null
  tipo_producto: string | null
  // Forma de pago original (datos al contratar)
  forma_pago_original: string | null
  plazos_original: string | null
  financiera_original: string | null
  importe_total_original: number | null
  importe_reserva_original: number | null
  importe_financiado_original: number | null
  // Forma de pago actual (puede haber cambiado)
  forma_pago_actual: string | null
  financiera_actual: string | null
  plazos_actual: string | null
  fecha_primer_pago_actual: string | null
  importe_total_actual: number | null
  importe_reserva_actual: number | null
  importe_financiado_actual: number | null
  created_at: string
  updated_at: string
  // Joins opcionales
  agente_nombre?: string | null
}

export interface Llamada {
  id: number
  alumno_id: number
  usuario_id: number | null
  fecha: string
  duracion_segundos: number | null
  resultado: ResultadoLlamada | null
  comentario: string | null
  estado_anterior: EstadoAlumno | null
  estado_nuevo: EstadoAlumno | null
  // Join opcional
  usuario_nombre?: string | null
}

export interface Documentacion {
  id: number
  alumno_id: number
  tipo: string
  recibido: boolean
  fecha_recepcion: string | null
  comentario: string | null
  created_at: string
}

// --- API request/response types ---

export interface AlumnoFilters {
  estado?: EstadoAlumno
  sede?: Sede
  asignado_a?: number
  search?: string
  page?: number
  limit?: number
}

export interface AlumnoUpdatePayload {
  estado?: EstadoAlumno
  ultimo_comentario?: string
  observaciones?: string
  asignado_a?: number | null
  fecha_ultimo_contacto?: string
  fecha_conversion?: string
}

export interface LlamadaCreatePayload {
  resultado: ResultadoLlamada
  comentario?: string
  duracion_segundos?: number
  estado_nuevo?: EstadoAlumno
}

export interface KpiSummary {
  total: number
  pendiente_llamar: number
  no_localizable: number
  llamado: number
  interesado: number
  en_proceso_sabadell: number
  convertidos: number
  rechazados: number
  tasa_conversion: number  // porcentaje 0-100
}
