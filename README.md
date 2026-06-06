# Control de Cobros (Prestamos al 20%)

Aplicacion personal para registrar clientes una sola vez, crear prestamos y luego solo registrar cuotas hasta completar el total.

## Stack

- Next.js (App Router + Server Actions)
- Prisma ORM
- Supabase PostgreSQL (base principal)

## Flujo de uso

1. Crear prestamo (nombre, valor, porcentaje, cuota, fechas).
2. Registrar cuotas sucesivas por cliente/prestamo.
3. Consultar analisis de cartera, ganancias y estado de clientes.

## Configuracion (Supabase)

1. Crea tu archivo de entorno usando el ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Completa en `.env` las variables de Supabase:

- `DATABASE_URL` (pooler de Supabase, puerto 6543)
- `DIRECT_URL` (conexion directa, puerto 5432)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Tambien define autenticacion basica de la app:

- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `AUTH_SECRET`

3. Sincroniza el esquema con Supabase:

```powershell
npx prisma db push
npx prisma generate
```

4. Verifica conexion a base:

```powershell
npm.cmd run db:check
```

5. Inicia la app:

```powershell
npm.cmd run dev
```

Si el puerto 3000 aparece ocupado, normalmente ya hay un servidor corriendo y puedes abrir directamente http://localhost:3000.

## Notas Prisma + Supabase

- `DATABASE_URL` se usa para runtime con pool de conexiones.
- `DIRECT_URL` se usa para operaciones directas de Prisma (por ejemplo `db push`) y evita errores del pooler al aplicar cambios.
- Mantener ambas URLs reduce fallas en desarrollo y despliegue.

## Comandos utiles

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run db:check
npm.cmd run local:check
npm.cmd run local:dev
```

## Variables de entorno para Vercel

Configura estas variables en Project Settings > Environment Variables:

- DATABASE_URL
	- postgresql://postgres:TU_DB_PASSWORD@db.ojksgdeamaxkissnnfma.supabase.co:5432/postgres?sslmode=require
- DIRECT_URL
	- postgresql://postgres:TU_DB_PASSWORD@db.ojksgdeamaxkissnnfma.supabase.co:5432/postgres?sslmode=require
- NEXT_PUBLIC_SUPABASE_URL
	- https://ojksgdeamaxkissnnfma.supabase.co
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	- sb_publishable_7kqw-hlf9NrAaAsX5URImw_3jiMLLqh
- NEXT_PUBLIC_SUPABASE_ANON_KEY
	- sb_publishable_7kqw-hlf9NrAaAsX5URImw_3jiMLLqh
- AUTH_USERNAME
	- admin
- AUTH_PASSWORD
	- define una clave segura
- AUTH_SECRET
	- define un secreto largo y aleatorio

Checklist de despliegue recomendado:

1. Completa TU_DB_PASSWORD en Vercel (Production, Preview y Development segun corresponda).
2. Ejecuta npx prisma db push con esas mismas credenciales para dejar el esquema sincronizado.
3. Verifica conexion con npm.cmd run db:check en local usando el mismo .env.
4. Despliega en Vercel.

## Si no puedes conectar desde local (P1001)

En algunas redes locales, el host directo de Supabase puede resolver por IPv6 y Prisma no logra conectar.

Plan B para crear tablas sin bloquearte:

1. Abre Supabase Dashboard > SQL Editor.
2. Ejecuta el script [supabase-init.sql](supabase-init.sql).
3. Verifica en Table Editor que existan Client, Loan y Payment.

Luego, para Vercel, usa el DATABASE_URL exacto de Connect > Prisma en tus variables de entorno.
