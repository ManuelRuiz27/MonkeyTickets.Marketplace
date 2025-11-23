# 🐋 Guía Docker - MonoMarket Tickets

## Requisitos Previos

- Docker Desktop instalado (Windows/Mac/Linux)
- Docker Compose v2+

## 🚀 Inicio Rápido - Desarrollo

### Opción 1: Docker Compose (Recomendado)

```powershell
# Iniciar todos los servicios (PostgreSQL, API, Frontend)
pnpm run docker:dev:build

# La primera vez tardará más porque construye las imágenes
# Después de la primera vez, puedes usar:
pnpm run docker:dev
```

Servicios disponibles:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### Detener servicios

```powershell
# Detener sin borrar volúmenes
pnpm run docker:dev:down

# Detener y limpiar todo (¡cuidado! borra la base de datos)
pnpm run docker:clean
```

## 📦 Estructura Docker

```
monomarket-tickets/
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
├── .dockerignore               # Archivos excluidos
├── .env.example                # Variables de entorno
├── apps/
│   ├── api/
│   │   ├── Dockerfile          # Imagen de producción API
│   │   └── Dockerfile.dev      # Imagen de desarrollo API
│   └── web/
│       ├── Dockerfile          # Imagen de producción Web
│       ├── Dockerfile.dev      # Imagen de desarrollo Web
│       └── nginx.conf          # Configuración nginx
```

## 🔧 Desarrollo con Docker

###Hot Reload Activado

El modo desarrollo (`docker-compose.dev.yml`) monta tu código fuente como volúmenes, lo que significa:

✅ Los cambios en el código se reflejan **instantáneamente** sin reconstruir
✅ Prisma migrations se ejecutan automáticamente
✅ OpenAPI types se regeneran en cada inicio

### Ver Logs

```powershell
# Ver logs de todos los servicios
docker-compose -f docker-compose.dev.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Ejecutar Comandos en Contenedores

```powershell
# Ejecutar migraciones de Prisma
docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:migrate

# Ejecutar seeds
docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:seed

# Abrir Prisma Studio
docker-compose -f docker-compose.dev.yml exec api pnpm run prisma:studio

# Acceder a la shell del contenedor
docker-compose -f docker-compose.dev.yml exec api sh
```

### Reiniciar un Servicio

```powershell
# Reiniciar solo el backend
docker-compose -f docker-compose.dev.yml restart api

# Reiniciar solo el frontend
docker-compose -f docker-compose.dev.yml restart web
```

## 🏭 Producción con Docker

### 1. Configurar Variables de Entorno

```powershell
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores de producción
```

**Variables importantes a configurar:**
- `JWT_SECRET`: Token secreto seguro
- `POSTGRES_PASSWORD`: Contraseña segura de PostgreSQL
- `VITE_API_URL`: URL de tu API en producción
- Claves de Conekta y Mercado Pago
- Configuración SMTP para emails

### 2. Construir y Ejecutar

```powershell
# Construir imágenes de producción
pnpm run docker:prod:build

# O simplemente ejecutar (usa imágenes en caché)
pnpm run docker:prod
```

### 3. Ejecutar Migraciones en Producción

```powershell
# Las migraciones se ejecutan automáticamente al iniciar el contenedor
# Pero si necesitas ejecutarlas manualmente:
docker-compose exec api pnpm run prisma:migrate
```

## 📊 Base de Datos

### Datos Persistentes

Los datos de PostgreSQL se almacenan en un **Docker volume** llamado `postgres_data`, lo que significa:
- Los datos persisten entre reinicios
- No se pierden al reconstruir contenedores
- Solo se borran con `docker:clean`

### Backup de Base de Datos

```powershell
# Crear backup
docker-compose exec postgres pg_dump -U monomarket monomarket_tickets > backup.sql

# Restaurar backup
cat backup.sql | docker-compose exec -T postgres psql -U monomarket monomarket_tickets
```

### Conectar a PostgreSQL desde tu Máquina

```powershell
# Usar psql
psql -h localhost -p 5432 -U monomarket -d monomarket_tickets

# O cualquier cliente GUI (TablePlus, DBeaver, etc.)
# Host: localhost
# Port: 5432
# User: monomarket
# Password: (ver docker-compose.dev.yml)
# Database: monomarket_tickets
```

## 🔍 Troubleshooting

### Error: Puerto ya en uso

```powershell
# Ver qué está usando el puerto
netstat -ano | findstr :5432
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Cambiar puerto en docker-compose.dev.yml:
# "5433:5432"  # PostgreSQL en puerto 5433
```

### Reconstruir desde cero

```powershell
# Detener todo y borrar volúmenes
pnpm run docker:clean

# Reconstruir todo
pnpm run docker:dev:build
```

### Problemas con node_modules

```powershell
# Borrar volúmenes anónimos de node_modules
docker-compose -f docker-compose.dev.yml down -v

# Reconstruir
docker-compose -f docker-compose.dev.yml up --build
```

### Ver espacio usado por Docker

```powershell
docker system df

# Limpiar imágenes no usadas
docker system prune -a
```

## 🚢 Despliegue

### Opción 1: VPS con Docker

```bash
# En tu servidor
git clone tu-repo
cd monomarket-tickets
cp .env.example .env
nano .env  # Configurar variables

docker-compose up -d
```

### Opción 2: Docker Registry

```powershell
# Etiquetar imágenes
docker tag monomarket-api:latest turegistro/monomarket-api:latest
docker tag monomarket-web:latest turegistro/monomarket-web:latest

# Subir a registry
docker push turegistro/monomarket-api:latest
docker push turegistro/monomarket-web:latest
```

### Opción 3: Render/Railway/Fly.io

Estos servicios detectan automáticamente los Dockerfiles y despliegan.

## 📋 Scripts Disponibles

```json
{
  "docker:dev": "Iniciar en modo desarrollo",
  "docker:dev:build": "Construir e iniciar desarrollo",
  "docker:dev:down": "Detener desarrollo",
  "docker:prod": "Iniciar en modo producción",
  "docker:prod:build": "Construir e iniciar producción",
  "docker:prod:down": "Detener producción",
  "docker:clean": "Limpiar todo (¡cuidado!)"
}
```

## 🎯 Mejores Prácticas

### Desarrollo
1. ✅ Usa `docker:dev` para desarrollo local
2. ✅ Los cambios se reflejan instantáneamente (hot reload)
3. ✅ Mantén `.env` fuera de git
4. ✅ Ejecuta seeds para tener datos de prueba

### Producción
1. ✅ Usa variables de entorno seguras
2. ✅ Mantén las imágenes actualizadas
3. ✅ Realiza backups regulares de PostgreSQL
4. ✅ Monitorea logs con `docker-compose logs`
5. ✅ Usa volúmenes para datos persistentes

## 🔐 Seguridad

### En Desarrollo
- ✅ PostgreSQL accesible en localhost:5432 (solo para desarrollo)
- ✅ Credenciales simples están bien

### En Producción
- ⚠️ **NUNCA** uses contraseñas por defecto
- ⚠️ **NUNCA** expongas PostgreSQL directamente
- ✅ Usa secretos seguros para JWT
- ✅ Configura HTTPS (usa nginx-proxy o Traefik)
- ✅ Limita CORS_ORIGIN a tu dominio

## 💡 Tips

### Optimizar Velocidad de Build

```powershell
# Usar BuildKit para builds más rápidos
$env:DOCKER_BUILDKIT=1
docker-compose build
```

### Ver tamaño de imágenes

```powershell
docker images | findstr monomarket
```

### Limpiar caché de build

```powershell
docker builder prune
```

---

¿Necesitas ayuda? Revisa los logs con `docker-compose logs -f` 🔍
