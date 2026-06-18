'use client'

import { useEffect, useState } from 'react'

const ROLES = ['admin', 'supervisor', 'agente']
const SEDES = ['Madrid', 'Barcelona', 'Valencia']

interface User {
  id: number
  nombre: string
  email: string
  rol: string
  sede: string | null
  activo: boolean
  force_change: boolean
}

interface AdminPanelProps {
  currentUserRol: string
}

export default function AdminPanel({ currentUserRol }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Formulario nuevo usuario
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'agente', sede: '' })
  const [creating, setCreating] = useState(false)

  // Modal edición
  const [editing, setEditing] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ nombre: '', rol: '', sede: '', activo: true, password: '' })
  const [saving, setSaving] = useState(false)

  const isAdmin = currentUserRol === 'admin'

  async function loadUsers() {
    setLoading(true)
    const r = await fetch('/api/users', { credentials: 'same-origin' })
    if (r.ok) setUsers(await r.json())
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  function notify(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setCreating(false)
    if (r.ok) {
      notify(`Usuario ${form.nombre} creado`)
      setForm({ nombre: '', email: '', password: '', rol: 'agente', sede: '' })
      loadUsers()
    } else {
      const d = await r.json()
      notify(d.error || 'Error al crear usuario', true)
    }
  }

  function openEdit(u: User) {
    setEditing(u)
    setEditForm({ nombre: u.nombre, rol: u.rol, sede: u.sede || '', activo: u.activo, password: '' })
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    const body: any = { nombre: editForm.nombre, rol: editForm.rol, sede: editForm.sede, activo: editForm.activo }
    if (editForm.password) body.password = editForm.password
    const r = await fetch(`/api/users/${encodeURIComponent(editing.email)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (r.ok) {
      notify('Usuario actualizado')
      setEditing(null)
      loadUsers()
    } else {
      const d = await r.json()
      notify(d.error || 'Error al guardar', true)
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/users/${encodeURIComponent(u.email)}`, { method: 'DELETE' })
    if (r.ok) { notify('Usuario eliminado'); loadUsers() }
    else { const d = await r.json(); notify(d.error || 'Error', true) }
  }

  async function toggleBlocked(u: User) {
    const r = await fetch(`/api/users/${encodeURIComponent(u.email)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !u.activo }),
    })
    if (r.ok) { notify(u.activo ? 'Usuario bloqueado' : 'Usuario activado'); loadUsers() }
  }

  const rolColor: Record<string, string> = {
    admin: '#0017EC',
    supervisor: '#6666F0',
    agente: '#5a5a8a',
  }

  return (
    <>
      {/* Alertas */}
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Formulario crear usuario — solo admin */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0017EC', marginBottom: '1rem' }}>
            Nuevo usuario
          </h2>
          <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <input className="input" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <input className="input" type="password" placeholder="Contraseña (mín. 8 chars)" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <select className="input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="input" value={form.sede} onChange={e => setForm(f => ({ ...f, sede: e.target.value }))}>
              <option value="">— Sede (opcional) —</option>
              {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ alignSelf: 'end' }}>
              {creating ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1.5px solid #E5E5FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0017EC' }}>
            Usuarios del equipo ({users.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5a5a8a' }}>Cargando…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Sede</th>
                  <th>Estado</th>
                  {isAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                    <td style={{ color: '#5a5a8a', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td>
                      <span className="badge" style={{ background: rolColor[u.rol] + '18', color: rolColor[u.rol], fontWeight: 700 }}>
                        {u.rol}
                      </span>
                    </td>
                    <td style={{ color: '#5a5a8a' }}>{u.sede || '—'}</td>
                    <td>
                      <span className="badge" style={{
                        background: u.activo ? '#bbf7d0' : '#fee2e2',
                        color: u.activo ? '#14532d' : '#991b1b',
                      }}>
                        {u.activo ? 'Activo' : 'Bloqueado'}
                      </span>
                      {u.force_change && (
                        <span className="badge" style={{ background: '#fef3c7', color: '#92400e', marginLeft: '0.35rem' }}>
                          Cambio pwd
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => openEdit(u)}>
                          Editar
                        </button>
                        <button
                          className="btn"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: u.activo ? '#fee2e2' : '#bbf7d0', color: u.activo ? '#991b1b' : '#14532d' }}
                          onClick={() => toggleBlocked(u)}
                        >
                          {u.activo ? 'Bloquear' : 'Activar'}
                        </button>
                        <button
                          className="btn"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b' }}
                          onClick={() => deleteUser(u)}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal edición */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,23,236,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,23,236,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, color: '#0017EC' }}>Editar — {editing.nombre}</h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#5a5a8a' }}>✕</button>
            </div>
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input" placeholder="Nombre completo" value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} required />
              <select className="input" value={editForm.rol} onChange={e => setEditForm(f => ({ ...f, rol: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className="input" value={editForm.sede} onChange={e => setEditForm(f => ({ ...f, sede: e.target.value }))}>
                <option value="">— Sin sede —</option>
                {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="input" type="password" placeholder="Nueva contraseña (dejar vacío para no cambiar)" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="btn btn-secondary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
