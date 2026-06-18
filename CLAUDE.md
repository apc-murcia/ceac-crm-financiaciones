# CEAC CRM — Gestión de Financiaciones

## Qué es esto
CRM para gestionar la conversión de matrículas de recibo propio
a financiación externa (Sabadell). ~1.217 alumnos, objetivo 20% conversión.

## Stack
- Next.js 14 (App Router) + TypeScript
- PostgreSQL 16 (via pg, sin ORM)
- Docker + Dokploy (despliegue)
- Auth: NextAuth.js

## Estructura
- `src/app/api/` — API routes
- `src/lib/db.ts` — conexión PostgreSQL
- `src/lib/auth.ts` — NextAuth config
- `src/lib/types.ts` — tipos TypeScript
- `src/components/` — componentes compartidos (DashboardNav, SessionProviderWrapper)
- `sql/01_schema.sql` — schema definitivo v1.3
- `scripts/import_csv.py` — importador CSV de Salesforce

## Campos de importes (IMPORTANTE)
- `importe_total_recibos` — Importe_Total__c (pendiente en recibos)
- `importe_reserva` — ReservaAmount__c (entrada ya pagada)
- `importe_financiado` — FinancedAmount__c (pendiente real — CAMPO CLAVE)
- `importe_oferta` — calculado: importe_financiado - 150€ (automático en BD, columna GENERATED)

## Estados del alumno
pendiente_llamar → no_localizable → llamado → interesado →
en_proceso_sabadell → convertido / rechazado_banco / rechazado_alumno

## Colores DocMgrStatus
Green, Yellow, Orange, Blue, Grey, Red

## Comandos
- `npm run dev` — servidor local puerto 3000
- `npm run build` — build producción
- `DATABASE_URL=... python scripts/import_csv.py fichero.csv` — importar CSV
- `docker compose up -d` — levantar postgres + app en Docker

## Variables de entorno necesarias
Copiar `.env.example` a `.env.local` y rellenar:
- `POSTGRES_PASSWORD` — contraseña PostgreSQL
- `NEXTAUTH_SECRET` — string aleatorio largo (genera con: `openssl rand -base64 32`)
- `DATABASE_URL` — conexión completa a PostgreSQL

## Primer arranque
1. `cp .env.example .env.local` y rellenar variables
2. `docker compose up -d postgres` — levantar solo la BD
3. El schema se aplica automáticamente al arrancar Docker (carpeta sql/ montada en initdb.d)
4. Cambiar el password del admin:
   ```sql
   UPDATE usuarios SET password_hash = '$2b$10$...' WHERE email = 'admin@ceac.es';
   ```
   Generar hash: `node -e "const b=require('bcryptjs'); console.log(b.hashSync('mipassword', 10))"`
5. `npm run dev` o `docker compose up -d`

## API endpoints
- `GET /api/alumnos` — lista con filtros: ?estado=&sede=&asignado_a=&search=&page=&limit=
- `POST /api/alumnos` — crear alumno (admin/supervisor)
- `GET /api/alumnos/[id]` — detalle + documentación
- `PUT /api/alumnos/[id]` — actualizar estado/comentario/asignación
- `DELETE /api/alumnos/[id]` — eliminar (solo admin)
- `GET /api/alumnos/[id]/llamadas` — historial de llamadas
- `POST /api/alumnos/[id]/llamadas` — registrar llamada (actualiza estado alumno)

## Roles de usuario
- `agente` — gestiona sus alumnos asignados
- `supervisor` — puede crear alumnos, ve todos
- `admin` — acceso completo, puede eliminar

## Convenciones
- Sin ORM: queries directas con pg
- Nombres en español para campos de negocio
- Upsert por sf_opportunity_id en importaciones
- No modificar sql/01_schema.sql sin actualizar versión en comentario
- Transacciones explícitas para operaciones que afectan múltiples tablas
