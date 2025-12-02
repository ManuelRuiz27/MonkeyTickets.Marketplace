# MonoMarket Tickets

MonoMarket Tickets es un monorepo full-stack (NestJS + React) que sigue la filosofía **contract-first**. La especificación OpenAPI se mantiene en `packages/contracts` y a partir de ella se generan los tipos TypeScript usados por el backend y el frontend.

## Arquitectura

- `apps/api`: backend NestJS con Prisma y colas Bull.
- `apps/web`: frontend React + Vite.
- `apps/scanner`: PWA para el lector QR y control de accesos (React + Vite).
- `packages/contracts`: especificación OpenAPI y tipos generados.
- `packages/config` y `packages/tsconfig`: utilidades y configuraciones compartidas.

## Requisitos

- Node.js >= 20
- pnpm >= 8
- PostgreSQL 15 (local o administrado) accesible via `DATABASE_URL`

## Instalación rápida

```bash
pnpm install
pnpm run contracts:generate
pnpm run build:packages
```

## Variables de entorno

### Backend (`apps/api/.env`)

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de Postgres. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Configuración de autenticación. |
| `OPENPAY_MERCHANT_ID`, `OPENPAY_PRIVATE_KEY`, `OPENPAY_PUBLIC_KEY`, `OPENPAY_PRODUCTION=false` | **Llaves privadas de Openpay (solo backend)**. Usa credenciales sandbox y deja `OPENPAY_PRODUCTION=false` mientras pruebas. |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_INTEGRATOR_ID` | **Llaves privadas de Mercado Pago (solo backend)**. Usa el Access Token de prueba; el integrator id es opcional. |
| `MP_PUBLIC_KEY` (deprecated) | Compatibilidad hacia atrás, utiliza preferentemente `MP_PUBLIC_KEY`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Configuración de correo (opcional). |

> Las llaves privadas nunca se comparten con el frontend. Solo el backend conoce `OPENPAY_PRIVATE_KEY` y `MP_ACCESS_TOKEN`.

### Frontend (`apps/web/.env`)

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL del backend (ej. `http://localhost:3000/api`). |
| `VITE_OPENPAY_MERCHANT_ID`, `VITE_OPENPAY_PUBLIC_KEY`, `VITE_OPENPAY_SANDBOX=true` | **Llaves públicas de Openpay** para tokenizar tarjetas desde el navegador. |
| `VITE_MP_PUBLIC_KEY`, `VITE_MP_LOCALE=es-MX` | Llave pública de Mercado Pago y locale para Checkout Pro / Wallet Brick. |

### Scanner (`apps/scanner/.env`)

| Variable | Descripcion |
| --- | --- |
| `VITE_API_URL` | URL del backend para validar tickets (ej. `http://localhost:3000/api`). |



## Desarrollo local

```bash
# Levanta API y Web con watch + contratos actualizados
pnpm run dev

# Servicios individuales
pnpm run dev:api
pnpm run dev:web
```

Antes de iniciar asegúrate de tener la base de datos creada (Postgres local o administrado) y haber copiado los `.env`:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Pagos (sandbox)

1. **Openpay**: el frontend usa Openpay.js para tokenizar tarjetas. Proporciona `VITE_OPENPAY_*` en `apps/web/.env` y en el backend configura `OPENPAY_*` en `apps/api/.env`. Mantén `OPENPAY_PRODUCTION=false` mientras utilices las llaves sandbox.
2. **Mercado Pago Checkout Pro**: el frontend pide una preferencia al backend (`POST /payments/mercadopago/preference`) usando la llave pública (`VITE_MP_PUBLIC_KEY`) y genera el botón/Wallet Brick. El backend firma la preferencia con `MP_ACCESS_TOKEN` y opcionalmente `MP_INTEGRATOR_ID`.
3. **Webhooks**: `POST /webhooks/mercadopago` registra el evento (por ahora sólo se loguea `type/action/data.id`).

## Deploy API en Vercel

El archivo 
ercel.json deja listo el backend para ejecutarse como Function de Node.js 20. Durante el build se compilan los paquetes compartidos, se aplican las migraciones (prisma migrate deploy) contra la base de datos de Neon y se genera pps/api/dist/vercel.js, que es el handler que expone todo el servidor NestJS dentro de la lambda.

Pasos recomendados:

1. Crea un proyecto en [Vercel](https://vercel.com/) apuntando a la ra?z del monorepo y selecciona pnpm como gestor sin modificar el 
ootDirectory.
2. Deja el comando de build incluido en 
ercel.json:  
   pnpm run build:packages && pnpm --filter @monomarket/api run prisma:migrate:deploy && pnpm --filter @monomarket/api run build.
3. Configura las variables sensibles desde el dashboard de Vercel (Production + Preview). Imprescindibles:
   - DATABASE_URL: ya est? precargada con la instancia de Neon proporcionada (postgresql://neondb_owner:...). Puedes rotar el password cuando lo necesites.
   - JWT_SECRET: cadena de al menos 64 caracteres.
   - REDIS_URL: endpoint de la instancia administrada (Upstash, Valkey Cloud, etc.).
   - API_URL: cambia a tu dominio propio si aplica; por defecto apunta a https://monomarket-api.vercel.app.
   - FRONTEND_URL y CORS_ORIGIN: URLs del frontend web y del scanner PWA.
   - Pasarelas de pago (MP_ACCESS_TOKEN, MP_PUBLIC_KEY, OPENPAY_MERCHANT_ID, OPENPAY_API_KEY, OPENPAY_PRIVATE_KEY, OPENPAY_PUBLIC_KEY, OPENPAY_PRODUCTION/OPENPAY_SANDBOX) y SMTP.
4. Despliega con 
ercel --prod o desde la UI. Todas las rutas (/(.*)) se redirigen al handler de NestJS, as? que este proyecto de Vercel queda dedicado ?nicamente al backend; los frontends deben residir en proyectos separados.

El handler serverless (pps/api/src/vercel.ts) reutiliza el mismo bootstrap que main.ts, por lo que no hay divergencia entre ejecutar la API con 
ode dist/main y hacerlo sobre Vercel Functions.


## Deploy API en Railway

El archivo `nixpacks.toml` define todo lo que Railway necesita (usa pnpm 8 + Node 20, instala dependencias con lockfile y compila solo los paquetes compartidos + `@monomarket/api`).

Pasos:

1. Crea un servicio en [Railway](https://railway.com/) apuntando al repositorio.
2. En la pestaña **Variables**, carga al menos:
   - `DATABASE_URL` (Postgres gestionado por Railway o externo).
   - `PORT=3000`.
   - `JWT_SECRET`, `API_URL`, `FRONTEND_URL`, `CORS_ORIGIN`.
   - Credenciales de pagos (`MP_*`, `OPENPAY_*`) y SMTP igual que en Vercel.
3. Railway detectará el `nixpacks.toml` y lanzará:
   - Instalación: `pnpm install --frozen-lockfile`.
   - Build: `pnpm run build:packages` y `pnpm --filter @monomarket/api run build`.
   - Start: `pnpm --filter @monomarket/api run start:deploy` (corre `prisma migrate deploy` y después `node dist/main.js`).
4. Configura el health check en `/api/health` (devuelve `status/database=ok` y responde 503 si no puede llegar a Postgres).

Con esto no necesitas comandos personalizados en Railway: basta con mantener el lockfile actualizado y las variables correctas.

## Base de datos

```bash
cd apps/api
pnpm run prisma:migrate      # aplica migraciones
pnpm run prisma:generate     # genera Prisma Client
pnpm run prisma:studio       # UI para explorar la DB
```

## Contratos y tipos

Cada cambio en `packages/contracts/openapi/monomarket-tickets.yaml` requiere regenerar los tipos:

```bash
pnpm run contracts:generate
```

Los tipos compilados se distribuyen mediante `pnpm run build:packages`.

## Pruebas y calidad

```bash
pnpm run test          # Ejecuta todas las pruebas
pnpm run lint          # Linter en cada workspace (puede emitir warnings)
pnpm run typecheck     # tsc --noEmit en todos los paquetes
```

## Scripts útiles

| Script | Descripción |
| --- | --- |
| `pnpm run dev` | Compila contratos, empaqueta dependencias compartidas y lanza API + Web. |
| `pnpm run build` | Compila contratos + config + API + Web. |

## Licencia

Propietario: MonoMarket Tickets.
