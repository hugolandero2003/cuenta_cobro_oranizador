# Control de Cobros (Prestamos al 20%)

Aplicacion personal para registrar clientes una sola vez, crear prestamos y luego solo registrar cuotas hasta completar el total.

## Stack

- Next.js (App Router + Server Actions)
- Prisma ORM
- PostgreSQL (ideal para Vercel)

## Flujo de uso

1. Crear prestamo (nombre, valor, porcentaje, cuota, fechas).
2. Registrar cuotas sucesivas por cliente/prestamo.
3. Consultar analisis de cartera, ganancias y estado de clientes.

## Configuracion local

1. Crea tu archivo de entorno usando el ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Edita `.env` y define `DATABASE_URL` con tu PostgreSQL.

Variables de autenticacion:

- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `AUTH_SECRET`

3. Sincroniza el esquema a la base:

```powershell
npx prisma db push
npx prisma generate
```

4. Inicia la app:

```powershell
npm run dev
```

## Opciones de base de datos recomendadas

- Opcion recomendada para despliegue: PostgreSQL en Neon o Supabase (free tier), conectado a Vercel con `DATABASE_URL`.
- Opcion ultra simple local: SQLite con Prisma. Es mas facil de arrancar, pero para Vercel es mejor PostgreSQL por robustez y escalado.

## Despliegue en Vercel

1. Subir proyecto a GitHub.
2. Importar repositorio en Vercel.
3. Configurar variables de entorno en Vercel:
	- `DATABASE_URL`
	- `AUTH_USERNAME`
	- `AUTH_PASSWORD`
	- `AUTH_SECRET`
4. Deploy.

El proyecto ya incluye `vercel.json` con build command para:

- generar Prisma Client
- sincronizar esquema con `prisma db push`
- compilar Next.js

No necesitas pasos manuales adicionales para crear tablas en cada deploy.

## Comandos utiles

```powershell
npm run dev
npm run build
npm run lint
```
