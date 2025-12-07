# MonoMarket - Checklist de validación previa a deploy

Este documento resume las validaciones mínimas que se deben ejecutar **antes de hacer deploy** (por ejemplo, a Render usando `render.yaml`), junto con el estado observado en la última ejecución local.

---

## 1. Resumen de estado (última corrida local)

- `pnpm install` → ✅ (ejecutado previamente, sin errores críticos)
- `pnpm --filter @monomarket/api run prisma:generate` → ✅
- `pnpm --filter @monomarket/api run build` → ✅
- `pnpm --filter @monomarket/api test` → ⚠️ **1 test fallando**  
  - Suite: `src/config/env.validation.spec.ts`  
  - Motivo: `EnvValidationService.validateEnvironment` lanza error por variables obligatorias faltantes (JWT_SECRET, API_URL, FRONTEND_URL, DATABASE_URL y credenciales de pagos) en escenarios de producción.  
  - Nota: es un test de validación de entorno; la lógica de negocio principal (checkout, pagos, webhooks, email, etc.) pasó sus tests.
- `pnpm --filter @monomarket/web run build` → ⚠️ **fallo de TypeScript**  
  - Archivo: `apps/web/src/pages/checkout/Checkout.tsx`  
  - Problemas:
    - Falta `@types/react-google-recaptcha` (TS7016).  
    - Parámetro `token` sin tipo explícito (TS7006).  
  - Siguiente paso recomendado:
    - Instalar tipos: `pnpm --filter @monomarket/web add -D @types/react-google-recaptcha`.  
    - Tipar el callback `onChange` del captcha en `Checkout.tsx`.
- `pnpm --filter @monomarket/scanner run build` → ✅ (build Vite + TypeScript correcto, con aviso de tamaño de bundle > 500 kB).

---

## 2. Pipeline recomendado de validación previa a deploy

### 2.1 Pasos en local

1. **Instalar dependencias del monorepo**  
   - Desde la raíz:  
     - `pnpm install`

2. **Backend API – Prisma + build NestJS**  
   - Generar cliente Prisma:  
     - `pnpm --filter @monomarket/api run prisma:generate`  
   - Compilar backend (NestJS + TypeScript):  
     - `pnpm --filter @monomarket/api run build`  
   - Esto valida que el esquema Prisma y todos los módulos (pagos, tickets, email, director, organizer, etc.) compilan sin errores de tipos.

3. **Tests clave del backend (recomendado)**  
   - Ejecutar suite de tests:  
     - `pnpm --filter @monomarket/api test`  
   - Priorizar:
     - `payments/*` (MP/OpenPay, webhooks).  
     - `modules/email/*` (envío de tickets).  
     - `modules/checkout/*` (reservas, totales).  
   - Si hay fallos:
     - Distinguir entre tests de negocio (deben quedar verdes antes del deploy) y tests de entorno (por ejemplo, `EnvValidationService` que asume configuración de producción estricta).

4. **Build de frontends (web + scanner)**  
   - Web (marketplace + checkout + paneles):  
     - `pnpm --filter @monomarket/web run build`  
   - Scanner (control de accesos):  
     - `pnpm --filter @monomarket/scanner run build`  
   - Confirma que marketplace, checkout, paneles y scanner siguen compilando contra la API actual.

5. **Smoke test local (API + healthcheck)**  
   - Levantar API en dev:  
     - `pnpm --filter @monomarket/api run dev`  
   - Verificar que `GET http://localhost:3000/api/health` responda 200.  
   - Opcional: levantar `apps/web` y hacer un flujo de compra rápido (crear evento, comprar, recibir tickets).

### 2.2 Deploy a Render (rama main)

6. **Push a la rama conectada a Render**  
   - Solo hacer `git push` a la rama que usa Render cuando los pasos 2–5 están verdes (o con fallos entendidos y aceptados, por ejemplo tests de entorno en `EnvValidationService`).

7. **Render ejecuta `render.yaml`**  
   - Backend `monomarket-api`:
     - `pnpm install --frozen-lockfile`  
     - `pnpm --filter @monomarket/api build`  
     - `pnpm --filter @monomarket/api run start:deploy` (incluye `prisma migrate deploy`).
   - Frontends:
     - `monomarket-web` y `monomarket-scanner` con sus `buildCommand` respectivos (Vite + React).
   - Infra:
     - `monomarket-db` (PostgreSQL) y `monomarket-redis` se crean/actualizan según `render.yaml`.

8. **Checklist post-deploy en Render**

   - Verificar que el servicio `monomarket-api`:
     - Pasa el healthcheck `/api/health`.  
     - Tiene configuradas las variables sensibles:
       - JWT: `JWT_SECRET`.  
       - DB: `DATABASE_URL`.  
       - Redis: `REDIS_URL`.  
       - Pagos: `OPENPAY_*`, `MP_*` / `MERCADOPAGO_*`.  
       - Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.
   - Verificar que:
     - `monomarket-web` y `monomarket-scanner` resuelven correctamente contra la URL pública de la API (`VITE_API_URL`).  
     - Flujos básicos (crear evento, comprar ticket, recibir email, escanear QR) funcionan en entorno de Render.

