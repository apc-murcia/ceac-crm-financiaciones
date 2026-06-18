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

        const result = await pool.query<Usuario>(
          'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
          [credentials.email.toLowerCase().trim()]
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).rol = token.rol
        ;(session.user as any).sede = token.sede
        ;(session.user as any).id = token.userId
      }
      return session
    },
  },
}
