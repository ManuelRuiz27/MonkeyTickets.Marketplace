# Despliegue en Render (Blueprint)

Este monorepo está preparado para desplegarse completo en Render usando el archivo `render.yaml` en la raíz.

## Servicios definidos en `render.yaml`

- **Base de datos Postgres**
  - `monomarket-db` (`type: database`, plan `basic-256mb`)
  - `ipAllowList: []` para que solo acepte conexiones internas desde Render.

- **API NestJS (`/api`)**
  - Servicio `monomarket-api` (`type: web`, `env: node`, plan `free`).
  - Build en la raíz del monorepo:
    - `pnpm install --frozen-lockfile`
    - `pnpm --filter @monomarket/api build`
  - Comando de arranque:
    - `pnpm --filter @monomarket/api run start:deploy`
  - Usa:
    - `DATABASE_URL` inyectado desde `monomarket-db`.
    - `REDIS_URL` inyectado desde `monomarket-redis`.
    - Validación de entorno estricta vía `EnvValidationService`.

- **Almacén Key Value (Redis)**
  - Servicio `monomarket-redis` (`type: keyvalue`, plan `free`).
  - `ipAllowList: []` para que solo sea accesible desde servicios internos en Render.

- **Frontend público (`/web`)**
  - Static Site `monomarket-web` apuntando a `apps/web`.
  - Build:
    - `pnpm install --frozen-lockfile`
    - `pnpm --filter @monomarket/web build`
  - `staticPublishPath: dist`.
  - Variables:
    - `VITE_API_URL=https://monomarket-api.onrender.com` (URL del backend).

- **Frontend de staff / scanner (`/scanner`)**
  - Static Site `monomarket-scanner` apuntando a `apps/scanner`.
  - Build:
    - `pnpm install --frozen-lockfile`
    - `pnpm --filter @monomarket/scanner build`
  - `staticPublishPath: dist`.
  - Variables:
    - `VITE_API_URL=https://monomarket-api.onrender.com`.

## Variables de entorno importantes

Estas variables están declaradas en `render.yaml` pero **no tienen valor** (`sync: false`) para que las completes desde el panel de Render:

- Autenticación / seguridad
  - `JWT_SECRET`
- Base de datos
  - `DATABASE_URL` (se inyecta automáticamente desde `monomarket-db`, no necesitas escribirla a mano).
- Redis
  - `REDIS_URL` (se inyecta automáticamente desde `monomarket-redis`).
- Mercado Pago
  - `MP_ACCESS_TOKEN`
  - `MP_PUBLIC_KEY`
  - `MP_WEBHOOK_SECRET`
- Openpay
  - `OPENPAY_MERCHANT_ID`
  - `OPENPAY_API_KEY`
  - `OPENPAY_PRIVATE_KEY`
  - `OPENPAY_PUBLIC_KEY`
- SMTP / email
  - `SMTP_USER`
  - `SMTP_PASSWORD`

Además, el backend valida en producción:

- `API_URL` (URL pública del servicio `monomarket-api`, por ejemplo `https://monomarket-api.onrender.com`).
- `FRONTEND_URL` (URL pública del frontend principal, por ejemplo `https://monomarket-web.onrender.com`). 

Asegúrate de que estos valores coincidan con los dominios reales que Render asigne a tus servicios.

## Pasos para desplegar con Blueprints

1. **Conectar el repo a Render**
   - En Render, crea una nueva aplicación usando tu cuenta de GitHub/GitLab y conecta el repositorio de `MonoMarket-Ticket`.

2. **Crear el Blueprint usando `render.yaml`**
   - En el panel de Render, ve a **Blueprints** → **New Blueprint**.
   - Elige el repositorio y la rama (`main` u otra que uses) y asegúrate de que Render detecte el archivo `render.yaml` en la raíz.

3. **Sincronizar el Blueprint**
   - Revisa que se creen los 4 recursos:
     - `monomarket-db` (Postgres)
     - `monomarket-redis` (Key Value)
     - `monomarket-api` (Web Service Node)
     - `monomarket-web` (Static Site)
     - `monomarket-scanner` (Static Site)
   - Haz clic en **Apply** / **Sync** para que Render cree o actualice todos los servicios.

4. **Configurar variables sensibles en el dashboard**
   - Una vez creados los servicios, entra al servicio `monomarket-api` → pestaña **Environment**.
   - Rellena los valores marcados con `sync: false` en `render.yaml`:
     - `JWT_SECRET` (mínimo 64 caracteres; en producción no puede ser el valor por defecto).
     - Credenciales de **Mercado Pago** (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`).
     - Credenciales de **Openpay** si las vas a usar en producción.
     - Credenciales de **SMTP** (`SMTP_USER`, `SMTP_PASSWORD`) y ajusta `SMTP_HOST`/`SMTP_PORT` si usas otro proveedor.
   - Ajusta también:
     - `API_URL` con la URL pública de `monomarket-api`.
     - `FRONTEND_URL` con la URL pública de `monomarket-web`.
     - `CORS_ORIGIN` con los orígenes reales de tus frontends en Render.

5. **Desplegar**
   - Una vez configuradas las variables, vuelve a la vista del Blueprint y ejecuta un nuevo **Sync** si hiciste cambios manuales.
   - Comprueba:
     - `/api/health` en `monomarket-api` para verificar que la API está saludable.
     - Que `monomarket-web` y `monomarket-scanner` cargan correctamente y consumen el backend usando `VITE_API_URL`.

Con esto, el monorepo queda listo para desplegar toda la plataforma (API + web + scanner + Postgres + Redis) en Render usando un único Blueprint.
