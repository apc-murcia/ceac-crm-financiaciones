import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CEAC CRM — Gestión de Financiaciones',
  description: 'CRM para conversión de matrículas a financiación externa Sabadell',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
