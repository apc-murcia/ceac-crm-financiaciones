import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { password_actual, password_nuevo, force_mode } = await req.json()

  if (!password_nuevo) return NextResponse.json({ error: 'Falta la nueva contraseña' }, { status: 400 })
  if (password_nuevo.length < 8) return NextResponse.json({ error: 'Mínimo 8 caracteres' }, { status: 400 })

  const { rows } = await pool.query(
    'SELECT password_hash, force_change FROM usuarios WHERE email = $1',
    [session.user?.email]
  )
  if (!rows.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const isForcedChange = rows[0].force_change && force_mode

  if (!isForcedChange) {
    // Cambio voluntario: requiere contraseña actual
    if (!password_actual) return NextResponse.json({ error: 'Falta la contraseña actual' }, { status: 400 })
    const valid = await bcrypt.compare(password_actual, rows[0].password_hash)
    if (!valid) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password_nuevo, 10)
  await pool.query(
    'UPDATE usuarios SET password_hash = $1, force_change = false WHERE email = $2',
    [hash, session.user?.email]
  )

  return NextResponse.json({ ok: true })
}
