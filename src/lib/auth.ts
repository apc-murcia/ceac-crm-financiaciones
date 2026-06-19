import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import pool from './db'
import type { Usuario } from './types'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.toLowerCase().trim()

        // Superadmin via env vars — no requiere entrada en BD
        if (
          process.env.BASIC_AUTH_USER &&
          process.env.BASIC_AUTH_PASSWORD &&
          email === process.env.BASIC_AUTH_USER.toLowerCase() &&
          credentials.password === process.env.BASIC_AUTH_PASSWORD
        ) {
          return {
            id: '0',
            name: 'Admin',
            email: process.env.BASIC_AUTH_USER,
            rol: 'admin',
            sede: null,
          }
        }

        const result = await pool.query<Usuario>(
          'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
          [email]
        )

        const user = result.rows[0]
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password_hash!)
        if (!valid) return null

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          rol: user.rol,
          sede: user.sede,
          acceso_modalidad: (user as any).acceso_modalidad || 'all',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as any).rol
        token.sede = (user as any).sede
        token.userId = Number((user as any).id)
        token.acceso_modalidad = (user as any).acceso_modalidad || 'all'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).rol = token.rol
        ;(session.user as any).sede = token.sede
        ;(session.user as any).id = token.userId
        ;(session.user as any).acceso_modalidad = token.acceso_modalidad
      }
      return session
    },
  },
}
