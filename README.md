# Control de Cobros (Prestamos al 20%)

Aplicacion personal para registrar clientes una sola vez, crear prestamos y luego solo registrar cuotas hasta completar el total.

## Stack

- Next.js (App Router + Server Actions)
- Prisma ORM
- PostgreSQL local para uso personal
- pgAdmin4 para administrar la base

## Flujo de uso

1. Crear prestamo (nombre, valor, porcentaje, cuota, fechas).
2. Registrar cuotas sucesivas por cliente/prestamo.
3. Consultar analisis de cartera, ganancias y estado de clientes.

## Configuracion local

1. Crea tu archivo de entorno usando el ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Configura tu `DATABASE_URL` en `.env` para PostgreSQL local.

```powershell
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/cobros_db?schema=public"
```

Variables de autenticacion:

- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `AUTH_SECRET`

3. Sincroniza el esquema a la base local:

```powershell
npx prisma db push
npx prisma generate
```

4. Inicia la app:

```powershell
npm.cmd run dev
```

Si el puerto 3000 aparece ocupado, normalmente ya hay un servidor corriendo y puedes abrir directamente http://localhost:3000.

Tambien puedes usar el flujo rapido local:

```powershell
npm.cmd run local:check
npm.cmd run local:dev
```

## Base de datos recomendada

- Opcion actual: PostgreSQL local (instalado en tu equipo) y pgAdmin4.
- Cuando quieras pasar a nube, migra a PostgreSQL en Neon o Supabase y actualiza `DATABASE_URL`.

## pgAdmin4

Con PostgreSQL local, revisa las tablas en:

- Servers > tu servidor local > Databases > cobros_db > Schemas > public > Tables

Parametros habituales del servidor local:

- Host: `localhost`
- Puerto: `5432`
- Maintenance DB: `cobros_db`
- Usuario: `postgres`
- Contraseña: la que configuraste en tu instalacion local

## Despliegue en Vercel

Vercel queda como paso opcional para despues. Primero trabaja local con PostgreSQL y, cuando quieras migrar, ajustamos la configuracion de despliegue.

## Comandos utiles

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run local:check
npm.cmd run local:dev
```
