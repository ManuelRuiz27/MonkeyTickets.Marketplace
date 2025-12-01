# 🚀 MonoMarket Tickets - Quick Start Guide

## ✅ Sistema Levantado y Listo

Los siguientes servicios están **activos y funcionando**:

```
✅ PostgreSQL      → Puerto 5432
✅ API Backend     → http://localhost:3000
✅ Web Frontend    → http://localhost
✅ Scanner PWA     → http://localhost:5174
✅ Base de Datos   → Seeds cargados
```

---

## 👥 Credenciales de Prueba

### Director
```
Email: director@monomarket.com
Password: password123
URL: http://localhost/login
```

### Organizador 1
```
Email: organizador@eventos.com
Password: password123
Negocio: Eventos Premium MX
URL: http://localhost/login
```

### Organizador 2
```
Email: maria@conciertos.com
Password: password123
Negocio: Conciertos Elite
URL: http://localhost/login
```

### Staff (Scanner)
```
Email: staff@eventos.com
Password: password123
URL: http://localhost:5174
<!-- ``` -->

---

## 🎫 Eventos de Prueba Disponibles

### 1. Concierto Rock en Vivo - The Legends
- **Tipo:** Público
- **Organizador:** Eventos Premium MX
- **Tickets:** General ($500) y VIP ($1,500)
- **Ventas:** 4 tickets vendidos
- **URL:** http://localhost (visible en marketplace)

### 2. Festival de Jazz 2024
- **Tipo:** Público
- **Organizador:** Conciertos Elite
- **Tickets:** General ($800)
- **URL:** http://localhost (visible en marketplace)

### 3. Evento Privado VIP - Cena de Gala
- **Tipo:** Unlisted (Privado)
- **Token:** `vip-gala-2024-exclusive`
- **Tickets:** VIP Exclusivo ($3,000)
- **URL:** http://localhost/public/events/unlisted/vip-gala-2024-exclusive

---

## 📊 Datos Precargados

```
👥 Usuarios: 4 (1 Director, 2 Organizadores, 1 Staff)
🎭 Organizadores: 2
🎪 Eventos: 3 (2 públicos, 1 unlisted)
🎫 Tipos de Tickets: 4
📦 Órdenes: 2 (ambas pagadas)
🎟️ Tickets: 4 (3 válidos, 1 usado)
💰 Planes de Comisión: 2
```

---

## 🧪 Pruebas Rápidas

### Como Director
1. Ir a `http://localhost/login`
2. Login con `director@monomarket.com` / `password123`
3. Ver dashboard global con métricas
4. Ver organizadores y órdenes

### Como Organizador
1. Ir a `http://localhost/login`
2. Login con `organizador@eventos.com` / `password123`
3. Ver mis eventos y ventas
4. Crear nuevo evento

### Como Comprador
1. Ir a `http://localhost` (sin login)
2. Ver eventos disponibles
3. Click en un evento
4. Comprar tickets (tarjeta de prueba: 4111 1111 1111 1111)

### Como Scanner
1. Ir a `http://localhost:5174`
2. Login con `staff@eventos.com` / `password123`
3. Seleccionar evento
4. Escanear QR de tickets

---

## 🔧 Comandos Útiles

### Ver servicios activos
```bash
docker ps
```

### Ver logs del API
```bash
docker logs monomarket-api -f
```

### Recargar datos de prueba
```bash
cd apps/api
npm run prisma:seed
```

### Detener servicios
```bash
docker-compose down
```

### Reiniciar servicios
```bash
docker-compose restart
```

---

## 📖 Documentación Completa

Ver archivo:
```
manual-pruebas-usuario.md
```

¡Sistema listo para pruebas! 🎉
