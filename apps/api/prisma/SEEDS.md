# 🌱 Guía de Seeds - Datos de Prueba

## Resumen
Este script popula la base de datos con datos de prueba realistas para facilitar el testing del MVP.

## 📦 Datos Creados

### Usuarios (4)
| Email | Password | Rol | Nombre |
|-------|----------|-----|--------|
| director@monomarket.com | password123 | DIRECTOR | Admin MonoMarket |
| organizador@eventos.com | password123 | ORGANIZER | Juan Pérez |
| maria@conciertos.com | password123 | ORGANIZER | María García |
| staff@eventos.com | password123 | STAFF | Carlos López |

### Organizadores (2)
1. **Eventos Premium MX**
   - Usuario: organizador@eventos.com
   - RFC: EPM123456ABC
   - Fee Plan: Básico (8.5%)
   - Status: ACTIVE

2. **Conciertos Elite**
   - Usuario: maria@conciertos.com
   - RFC: CEL654321XYZ
   - Fee Plan: Premium (5%)
   - Status: ACTIVE

### Eventos (4)

#### 1. Concierto Rock en Vivo - The Legends ✅ PUBLICADO
- **Organizador**: Eventos Premium MX
- **Fecha**: Próxima semana
- **Venue**: Foro Sol, CDMX
- **Capacidad**: 500
- **Status**: PUBLISHED, Público
- **Templates**:
  - General: $500 (400 disponibles, 75 vendidos)
  - VIP: $1,500 (100 disponibles, 30 vendidos)

#### 2. Festival de Jazz 2024 ✅ PUBLICADO
- **Organizador**: Conciertos Elite
- **Fecha**: Próximo mes
- **Venue**: Teatro Metropolitan, CDMX
- **Capacidad**: 300
- **Status**: PUBLISHED, Público
- **Templates**:
  - General: $800 (250 disponibles, 120 vendidos)
  - Premium: $1,200 (50 disponibles, 25 vendidos)

#### 3. Evento Privado VIP - Cena de Gala 🔒 UNLISTED
- **Organizador**: Eventos Premium MX
- **Fecha**: Próxima semana + 3 días
- **Venue**: Hotel St. Regis, CDMX
- **Capacidad**: 50
- **Status**: PUBLISHED, Unlisted
- **Token**: `vip-gala-2024-exclusive`
- **Templates**:
  - VIP Exclusivo: $3,000 (50 disponibles, 15 vendidos)

#### 4. Stand-up Comedy Night 📝 BORRADOR
- **Organizador**: Conciertos Elite
- **Fecha**: Próxima semana + 10 días
- **Venue**: Café Tacvba, CDMX
- **Status**: DRAFT
- **Templates**:
  - General: $350 (100 disponibles, 0 vendidos)

### Compradores (3)
1. Pedro Ramírez - cliente1@gmail.com
2. Ana López - ana.lopez@hotmail.com
3. Carlos Ruiz - carlos.ruiz@yahoo.com

### Órdenes (3)

#### Orden 1 - ✅ PAGADA
- **Comprador**: Pedro Ramírez
- **Evento**: Concierto Rock en Vivo
- **Items**: 2x General ($500 c/u)
- **Total**: $1,000
- **Método**: Modo prueba (sin pasarela)
- **Status**: PAID
- **Tickets**: 2 generados (ambos sin usar)

#### Orden 2 - ✅ PAGADA
- **Comprador**: Ana López
- **Evento**: Concierto Rock en Vivo
- **Items**: 2x VIP ($1,500 c/u)
- **Total**: $3,000
- **Método**: Modo prueba (sin pasarela)
- **Status**: PAID
- **Tickets**: 2 generados (1 sin usar, 1 ya usado - check-in hecho)

#### Orden 3 - ⏳ PENDIENTE
- **Comprador**: Carlos Ruiz
- **Evento**: Festival de Jazz
- **Items**: 2x General ($800 c/u)
- **Total**: $1,600
- **Método**: Manual (pendiente)
- **Status**: PENDING (esperando pago)
- **Tickets**: 0 (se generarán al confirmar pago)

### Fee Plans (2)
1. **Plan Básico**: 8.5% comisión
2. **Plan Premium**: 5% comisión

---

## 🚀 Cómo Usar

### Opción 1: Ejecutar seed manualmente
```bash
cd apps/api

# Asegurarse de que la DB existe
npx prisma migrate deploy

# Ejecutar seed
npm run prisma:seed
```

### Opción 2: Seed automático con migraciones
```bash
cd apps/api

# Reset completo (CUIDADO: borra todo)
npx prisma migrate reset
# Esto automáticamente corre el seed después
```

### Opción 3: Solo seed (sin resetear)
```bash
cd apps/api
npx prisma db seed
```

---

## 🧪 Escenarios de Testing

### 1. Login y Dashboard
- ✅ Login como director
- ✅ Login como organizador 1 o 2
- ✅ Ver métricas y eventos en dashboard

### 2. Eventos Públicos
- ✅ Navegar marketplace
- ✅ Ver "Concierto Rock" y "Festival Jazz"
- ✅ NO ver "Cena de Gala" (es unlisted)

### 3. Evento Unlisted
- ✅ Acceder a: `/public/events/unlisted/vip-gala-2024-exclusive`
- ✅ Verificar que se muestra el evento privado

### 4. Ver Órdenes Existentes
- ✅ En director dashboard buscar órdenes
- ✅ Ver detalles de orden pagada
- ✅ Ver tickets generados
- ✅ Ver orden pendiente sin tickets

### 5. Generar Cortesías
- ✅ Login como organizador
- ✅ Ir a cualquier evento
- ✅ Click "Cortesías"
- ✅ Generar cortesías de prueba

### 6. Check-in de Tickets
- ✅ Usar el QR de ticket #4 (ya usado)
- ✅ Intentar check-in debería fallar
- ✅ Usar tickets #1, #2, #3 (disponibles)
- ✅ Check-in debería funcionar

### 7. Fee Plans
- ✅ Ver que "Eventos Premium MX" tiene 8.5%
- ✅ Ver que "Conciertos Elite" tiene 5%
- ✅ Verificar comisiones en órdenes pagadas

---

## 🔄 Reset y Re-seed

Si quieres volver a empezar desde cero:

```bash
cd apps/api

# Opción A: Reset completo (recomendado)
npx prisma migrate reset

# Opción B: Borrar + seed manual
npx prisma db push --force-reset
npm run prisma:seed
```

---

## 📊 Verificación de Datos

Después de correr el seed, puedes verificar con Prisma Studio:

```bash
cd apps/api
npm run prisma:studio
```

Esto abrirá una UI en http://localhost:5555 donde puedes ver todos los datos.

---

## ⚠️ Notas Importantes

1. **Passwords**: Todos los usuarios usan `password123` (hash bcrypt)
2. **QR Codes**: Los códigos QR son placeholders. En producción se generarían JWT tokens reales.
3. **Emails**: Los EmailLogs están creados pero NO se enviaron emails reales
4. **Fechas**: Los eventos tienen fechas relativas (próxima semana, próximo mes)
5. **Reset**: El script BORRA todos los datos existentes al inicio

---

## 🎯 Testing Checklist

Después de correr seeds:

- [ ] Login con cada rol funciona
- [ ] Dashboard de organizador muestra eventos correctos
- [ ] Dashboard de director muestra KPIs correctos
- [ ] Marketplace muestra 2 eventos públicos
- [ ] Evento unlisted NO aparece en marketplace
- [ ] Evento unlisted accesible vía token
- [ ] Órdenes pagadas tienen tickets generados
- [ ] Orden pendiente NO tiene tickets
- [ ] Check-in de ticket usado falla
- [ ] Fee plans correctos asignados

---

**Happy Testing! 🎉**
