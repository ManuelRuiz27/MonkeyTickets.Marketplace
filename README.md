# MonoMarket Tickets

Un monorepo full-stack en TypeScript para plataforma de marketplace de eventos con ticketing, pagos y gestión.

## 🏗️ Arquitectura

Este monorepo usa **pnpm workspaces** y sigue un enfoque de desarrollo contract-first:

- **API Backend** (`apps/api`): API REST en NestJS con Prisma ORM
- **SPA Frontend** (`apps/web`): Aplicación React + Vite
- **Contratos** (`packages/contracts`): Especificación OpenAPI y tipos TypeScript generados
- **Configuración Compartida** (`packages/config`, `packages/tsconfig`): Utilidades y configuraciones comunes

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 20+ LTS
- pnpm 8+

### Instalación

```bash
# Instalar dependencias
pnpm install

# Generar tipos TypeScript desde la especificación OpenAPI
pnpm run contracts:generate

# Compilar paquetes compartidos
pnpm run build:packages
```

### Configuración de Base de Datos

```bash
# Copiar variables de entorno
cp apps/api/.env.example apps/api/.env

# Editar apps/api/.env y configurar tu DATABASE_URL

# Ejecutar migraciones de base de datos
cd apps/api
pnpm run prisma:migrate

# (Opcional) Abrir Prisma Studio para ver/editar la base de datos
pnpm run prisma:studio
```

### Desarrollo con Docker 🐋

**Opción recomendada** para evitar configurar PostgreSQL localmente:

```bash
# Iniciar todo con Docker (PostgreSQL + API + Frontend)
pnpm run docker:dev:build

# Servicios disponibles:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - PostgreSQL: localhost:5432
```

Ver [DOCKER.md](DOCKER.md) para documentación completa de Docker.

### Desarrollo

```bash
# Iniciar backend y frontend concurrentemente
pnpm run dev

# O iniciar individualmente:
pnpm run dev:api   # Backend en http://localhost:3000
pnpm run dev:web   # Frontend en http://localhost:5173
```

### Compilación

```bash
# Compilar todos los paquetes y aplicaciones
pnpm run build

# Verificar tipos en todo el monorepo
pnpm run typecheck
```

## 📦 Estructura del Workspace

```
monomarket-tickets/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend React
├── packages/
│   ├── contracts/    # OpenAPI + tipos generados
│   ├── config/       # Utilidades de configuración compartidas
│   └── tsconfig/     # Configuraciones TypeScript compartidas
```

## 🔄 Sincronización de Contratos

La especificación OpenAPI en `packages/contracts/openapi/monomarket-tickets.yaml` es la **única fuente de verdad** para contratos de API.

Cuando modifiques la especificación OpenAPI:

```bash
# Regenerar tipos TypeScript
pnpm run contracts:generate

# Los tipos estarán disponibles en backend y frontend
```

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
pnpm run test

# Ejecutar pruebas en modo watch
pnpm run test:watch
```

## 🎨 Calidad de Código

```bash
# Lintear todos los paquetes
pnpm run lint

# Corregir problemas de linting
pnpm run lint:fix

# Formatear código
pnpm run format

# Verificar formato
pnpm run format:check
```

## 📝 Licencia

Propietario - MonoMarket Tickets
