import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes; current += char }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++
      if (current.trim()) lines.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) lines.push(current)

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === ';' && !inQ) {
        fields.push(cur); cur = ''
      } else {
        cur += c
      }
    }
    fields.push(cur)
    return fields
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(l => parseRow(l))
  return { headers, rows }
}

function parseFecha(val: string): string | null {
  if (!val?.trim()) return null
  // Convierte DD/MM/YYYY → YYYY-MM-DD
  const parts = val.trim().split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return null
}

function parseImporte(val: string): number | null {
  if (!val?.trim()) return null
  const cleaned = val.trim().replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function mapEstado(stageName: string): string {
  if (!stageName) return 'pendiente_llamar'
  if (stageName.includes('ganada') || stageName.includes('Activada')) return 'activo'
  if (stageName.toLowerCase().includes('baja')) return 'baja'
  return 'pendiente_llamar'
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any)?.rol
  if (!['admin', 'supervisor'].includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No se recibió fichero' }, { status: 400 })

  const text = await file.text()
  const { headers, rows } = parseCSV(text)
  const col = (name: string) => headers.indexOf(name)

  let inserted = 0, updated = 0, errors = 0
  const errorSamples: string[] = []

  for (const row of rows) {
    if (row.length < 10) continue
    try {
      const sfId = row[col('Opportunity.Id')]?.trim()
      if (!sfId) continue

      const nombreCompleto = row[col('Opportunity.Account.Name')]?.trim() || ''
      const parts = nombreCompleto.split(' ')
      const nombre = parts.slice(0, 2).join(' ')
      const apellidos = parts.slice(2).join(' ') || null

      const sfOrderId = row[col('Opportunity.OrderInProgress__r.Id')]?.trim() || null

      const values = [
        sfId,
        sfOrderId,
        nombre,
        apellidos,
        row[col('Opportunity.Account.PersonEmail')]?.trim() || null,
        row[col('Opportunity.Account.Phone')]?.trim() || null,
        row[col('Opportunity.Center__r.Name')]?.trim() || null,
        row[col('Opportunity.ActualProducts__c')]?.split(',')[0]?.trim() || null,
        row[col('Opportunity.Modality__c')]?.trim() || null,
        mapEstado(row[col('Opportunity.StageName')]?.trim()),
        parseImporte(row[col('Opportunity.OrderInProgress__r.Importe_Total__c')]),
        parseImporte(row[col('Opportunity.OrderInProgress__r.ReservaAmount__c')]),
        parseImporte(row[col('Opportunity.OrderInProgress__r.FinancedAmount__c')]),
        row[col('Opportunity.OrderInProgress__r.DocMgrStatus__c')]?.trim() || null,
        row[col('Opportunity.OrderInProgress__r.InternalComments__c')]?.trim() || null,
        parseFecha(row[col('CreatedDate')]),
        row[col('Tipo producto')]?.trim() || null,
      ]

      // Upsert por sf_order_id si existe (matrícula SF), si no por sf_opportunity_id
      // El índice de sf_order_id es parcial (WHERE sf_order_id IS NOT NULL)
      // El índice de sf_opportunity_id es parcial (WHERE sf_order_id IS NULL)
      const commonSet = [
        'nombre = EXCLUDED.nombre',
        'apellidos = EXCLUDED.apellidos',
        'email = EXCLUDED.email',
        'telefono = EXCLUDED.telefono',
        'sede = EXCLUDED.sede',
        'curso = EXCLUDED.curso',
        'modalidad = EXCLUDED.modalidad',
        'estado = EXCLUDED.estado',
        'importe_total_recibos = EXCLUDED.importe_total_recibos',
        'importe_reserva = EXCLUDED.importe_reserva',
        'importe_financiado = EXCLUDED.importe_financiado',
        'doc_mgr_status = EXCLUDED.doc_mgr_status',
        'ultimo_comentario = EXCLUDED.ultimo_comentario',
        'tipo_producto = EXCLUDED.tipo_producto',
        'updated_at = NOW()',
      ].join(', ')

      let conflictClause: string
      let updateSetFinal: string
      if (sfOrderId) {
        conflictClause = '(sf_order_id) WHERE sf_order_id IS NOT NULL'
        updateSetFinal = commonSet
      } else {
        conflictClause = '(sf_opportunity_id) WHERE sf_order_id IS NULL'
        updateSetFinal = 'sf_order_id = EXCLUDED.sf_order_id, ' + commonSet
      }

      const result = await pool.query(`
        INSERT INTO alumnos (
          sf_opportunity_id, sf_order_id, nombre, apellidos, email, telefono,
          sede, curso, modalidad, estado,
          importe_total_recibos, importe_reserva, importe_financiado,
          doc_mgr_status, ultimo_comentario, fecha_conversion, tipo_producto
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT ${conflictClause} DO UPDATE SET ${updateSetFinal}
        RETURNING (xmax = 0) AS was_inserted
      `, values)

      if (result.rows[0]?.was_inserted) inserted++
      else updated++
    } catch (err: any) {
      errors++
      if (errorSamples.length < 3) errorSamples.push(String(err?.message || err))
    }
  }

  return NextResponse.json({ inserted, updated, errors, total: inserted + updated, errorSamples })
}
