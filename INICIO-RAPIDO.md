# 🚀 Inicio Rápido - MonoMarket Tickets con Docker

Este documento te guía para levantar **todo el proyecto en un solo comando** usando Docker.

## 📋 Prerequisitos

✅ Docker Desktop instalado y corriendo  
✅ Git instalado (para clonar el proyecto si aún no lo tienes)

## 🎯 Levantar Todo el Proyecto

### Opción 1: Modo Desarrollo (Recomendado para desarrollo local)

```powershell
# Navegar al directorio del proyecto
cd "c:\Users\ruiz_\Music\Monotickets POS\monomarket-tickets"

# Levantar todos los servicios por primera vez (construye las imágenes)
pnpm run docker:dev:build

# Para siguientes ejecuciones (más rápido, usa imágenes en caché)
pnpm run docker:dev
```

**Servicios levantados:**
- 🌐 **Frontend Web**: http://localhost:5173
- 📱 **Scanner PWA**: http://localhost:5174  
- 🔌 **Backend API**: http://localhost:3000
- 🗄️ **PostgreSQL**: localhost:5432

### Opción 2: Modo Producción

```powershell
# Navegar al directorio del proyecto
cd "c:\Users\ruiz_\Music\Monotickets POS\monomarket-tickets"

# Asegurarse de tener el archivo .env configurado
# (Ya existe uno con valores de desarrollo)

# Levantar todos los servicios en modo producción
pnpm run docker:prod:build
```

**Servicios levantados:**
- 🌐 **Frontend Web**: http://localhost (puerto 80)  
- 📱 **Scanner PWA**: http://localhost:5174
- 🔌 **Backend API**: http://localhost:3000
- 🗄️ **PostgreSQL**: localhost:5432

## 📊 Comandos Útiles

### Ver logs de todos los servicios
```powershell
docker-compose -f docker-compose.dev.yml logs -f
```

### Ver logs de un servicio específico
```powershell
# Ver logs del backend
docker-compose -f docker-compose.dev.yml logs -f api

# Ver logs del frontend
docker-compose -f docker-compose.dev.yml logs -f web

# Ver logs del scanner
docker-compose -f docker-compose.dev.yml logs -f scanner

# Ver logs de la base de datos
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Ejecutar comandos dentro de los contenedores

```powershell
# Ejecutar migraciones de base de datos
docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:migrate:deploy

# Ejecutar seeds (datos de prueba)
docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:seed

# Abrir Prisma Studio (interfaz web para ver la base de datos)
docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:studio
# Luego abre: http://localhost:5555

# Acceder a la shell del contenedor API
docker-compose -f docker-compose.dev.yml exec api sh

# Acceder a PostgreSQL directamente
docker-compose -f docker-compose.dev.yml exec postgres psql -U monomarket -d monomarket_tickets
```

### Detener los servicios

```powershell
# Detener sin borrar datos
pnpm run docker:dev:down

# Detener modo producción
pnpm run docker:prod:down
```

### Limpiar todo (¡CUIDADO! Borra la base de datos)

```powershell
# Esto borra todos los contenedores, volúmenes y datos
pnpm run docker:clean
```

## 🔧 Reiniciar un servicio específico

```powershell
# Reiniciar solo el backend (útil si hace falta)
docker-compose -f docker-compose.dev.yml restart api

# Reiniciar solo el frontend
docker-compose -f docker-compose.dev.yml restart web

# Reiniciar solo el scanner
docker-compose -f docker-compose.dev.yml restart scanner

# Reiniciar PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

## 🔍 Troubleshooting (Resolución de problemas)

### ❌ Error: "Puerto ya en uso"

```powershell
# Ver qué proceso está usando el puerto
netstat -ano | findstr :5173  # Frontend
netstat -ano | findstr :3000  # Backend
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :5174  # Scanner

# Opción 1: Detener el proceso que usa el puerto
# Opción 2: Cambiar el puerto en docker-compose.dev.yml o .env
```

### ❌ Error: "Cannot connect to database"

```powershell
# Verificar que PostgreSQL esté corriendo
docker-compose -f docker-compose.dev.yml ps

# Ver logs de PostgreSQL
docker-compose -f docker-compose.dev.yml logs postgres

# Reiniciar PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

### ❌ Error: "Module not found" o problemas de dependencias

```powershell
# Reconstruir desde cero
pnpm run docker:clean
pnpm run docker:dev:build
```

### ❌ El frontend no carga o muestra página en blanco

```powershell
# Ver logs del frontend
docker-compose -f docker-compose.dev.yml logs web

# Reconstruir solo el frontend
docker-compose -f docker-compose.dev.yml up -d --build web
```

## 📦 ¿Qué contiene cada contenedor?

| Servicio | Tecnología | Puerto | Descripción |
|----------|-----------|--------|-------------|
| **postgres** | PostgreSQL 15 | 5432 | Base de datos principal |
| **api** | NestJS | 3000 | Backend API REST |
| **web** | React + Vite | 5173 (dev) / 80 (prod) | Frontend principal (marketplace) |
| **scanner** | React + Vite PWA | 5174 | App para escanear QR de tickets |

## 🎨 Acceder a la aplicación

1. **Abrir el frontend principal**: http://localhost:5173
2. **Abrir el scanner**: http://localhost:5174
3. **API Docs (Swagger)**: http://localhost:3000/api/docs

## 💾 Datos Persistentes

Todos los datos de la base de datos se guardan en un **Docker volume** llamado `postgres_data`.

- ✅ Los datos **NO se pierden** al reiniciar los contenedores
- ✅ Los datos **NO se pierden** al reconstruir las imágenes
- ⚠️ Los datos **SÍ se borran** al ejecutar `pnpm run docker:clean`

### Hacer backup de la base de datos

```powershell
# Crear backup
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U monomarket monomarket_tickets > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Restaurar backup
Get-Content backup_20241128_120000.sql | docker-compose -f docker-compose.dev.yml exec -T postgres psql -U monomarket monomarket_tickets
```

## ⚙️ Variables de Entorno

El archivo `.env` ya está configurado con valores de desarrollo. Para producción:

1. Copia `.env.example` a `.env`
2. Edita los valores según tu entorno
3. **IMPORTANTE**: Cambia `JWT_SECRET`, `POSTGRES_PASSWORD` y las claves de pago

## 🎯 Próximos Pasos

Después de levantar el proyecto:

1. ✅ Verifica que todos los servicios estén corriendo:
   ```powershell
   docker-compose -f docker-compose.dev.yml ps
   ```

2. ✅ Ejecuta las migraciones (se ejecutan automáticamente, pero puedes forzarlas):
   ```powershell
   docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:migrate:deploy
   ```

3. ✅ Carga datos de prueba (seeds):
   ```powershell
   docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:seed
   ```

4. 🌐 Abre http://localhost:5173 en tu navegador

## 📚 Documentación Adicional

- [DOCKER.md](./DOCKER.md) - Documentación completa de Docker
- [README.md](./README.md) - Documentación general del proyecto
- [QUICK-START.md](./QUICK-START.md) - Guía de inicio sin Docker

---

**¿Necesitas ayuda?** Revisa los logs con `docker-compose logs -f` 🔍
