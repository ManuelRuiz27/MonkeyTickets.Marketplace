# Modelo Operativo del MVP

El sistema funciona como un **Marketplace público** donde organizadores publican eventos y compradores adquieren boletos como invitados (sin necesidad de cuenta).

## 1. Modelos Activos y Desactivados

### Modelos activos en MVP:
- **Modelo A** — Eventos Públicos
- **Modelo B** — Eventos Ocultos/Unlisted (link directo)

### Modelo desactivado:
- ❌ **Pre-campañas (Modelo C)**

---

## 2. Módulos incluidos en el MVP

### 2.1. Módulo del Organizador (Nivel A)

El organizador puede:

#### Gestión de Eventos
- Crear evento (nombre, fecha, horario, lugar, capacidad mínima 50 boletos)
- Editar evento
- Publicar/Despublicar evento
- Ver listado de eventos

#### Boletos
- Crear tipos de boletos (general, VIP, etc.)
- Definir precios + cargos por servicio aplicados automáticamente
- Configurar capacidad/stock
- Subir plantilla PDF personalizada (opcional), si no usa la plantilla default
- Ver ventas y compradores

#### Ventas
- Ver detalle de órdenes
- Descargar boletos PDF del comprador (para reenviar manualmente si lo requiere)

#### QR dinámico integrado
- QR firmado con JWT
- Incluye validaciones antifraude
- QR se valida desde módulo Staff

---

### 2.2. Módulo del Comprador (Invitado)

**No necesita cuenta.**

#### Checkout
- Seleccionar boletos
- Añadir datos requeridos:
  - Nombre
  - Email
  - Teléfono
- Mostrar resumen del pedido (backend calcula totales)

#### Pasarela de Pagos (MVP)
**OpenPay** como proveedor principal:
- Tarjeta
- SPEI
- Pago en OXXO

**Mercado Pago** solo para:
- Google Pay
- Apple Pay

#### Entrega de Boletos
- Descarga desde navegador
- Envío por email
- **Sin WhatsApp. Sin SMS.**

---

### 2.3. Módulo Staff (Control de Accesos)

Acceso por token único.

Incluye:
- Pantalla de escaneo QR
- Validación en tiempo real contra backend
- Señales visuales:
  - Verde → válido
  - Rojo → inválido o repetido
- Historial básico de escaneos en la misma sesión

---

### 2.4. Módulo Director (Superadmin)

Con controles globales.

#### Funciones del Director
- Crear organizadores
- Definir comisiones globales y cargos por servicio
- Definir tarifas personalizadas por organizador
- Dashboard global:
  - Total de ventas
  - Tickets generados
  - Eventos activos
  - Organizaciones activas
- Reenviar boletos por email
- Revisar logs de órdenes y correos

**Sin préstamos. Sin créditos.**

---

## 3. Funcionamiento de los Boletos

Cada boleto es un **PDF generado automáticamente**.

### Plantilla:
- Default del sistema o la plantilla subida por el organizador

### Incluye:
- Datos del evento
- Datos del comprador
- Tipo de boleto
- QR con firma JWT

**Descargable inmediatamente tras el pago.**

---

## 4. Seguridad

### QR dinámico firmado con expiración

### Validaciones antifraude:
- Firma JWT
- Prevención de duplicados
- Rate limit en `/scan/validate`

### Checkout antibots:
- CAPTCHAs opcionales
- Reservación temporal 2–5 min para evitar overselling

---

## 5. Reglas Comerciales

### Cargos por servicio
```
cargo_servicio = comisión_base + impuestos
```
Ajustable por Director.

### Cortesías (MVP)

Se mantienen, pero simples:
- Eventos <2500 personas → 5 cortesías
- Eventos ≥2500 → 330 cortesías
- Cortesías adicionales pagan solo el cargo de servicio
- No pasan por pasarela
- Generan QR y PDF igual que un boleto pagado

---

## 6. Tecnología (MVP)

### Backend:
- NestJS (Fastify)
- PostgreSQL
- Prisma ORM
- Redis para locks y colas básicas
- OpenPay + MercadoPago

### Frontend:
- React con Vite
- Tailwind
- Antigravity opcional (pregunto si los prompts son Codex o Gravity antes de generarlos)

---

## 7. Limitaciones del MVP

Conscientemente simplificado:

### No incluye:
- ❌ WhatsApp
- ❌ Landings animadas
- ❌ Flipbook premium
- ❌ Préstamos
- ❌ Ledger contable
- ❌ Afiliados
- ❌ Multi-organizador avanzado

### No se genera:
- ❌ Reportes PDF avanzados
- ❌ Estadísticas profundas
- ❌ Embudos de conversión
- ❌ Notificaciones push

**Todo esto queda para V1.1 o V2.**

---

## 8. Checklist del MVP (para validar que está completo)

### ✅ Organizador
- [ ] Crear/editar/publicar eventos
- [ ] Crear tipos de boleto
- [ ] Subir plantilla PDF opcional
- [ ] Ver ventas y compradores
- [ ] Descargar boletos

### ✅ Checkout
- [ ] Calcular totales en backend
- [ ] Procesar pagos (OpenPay + MercadoPago)
- [ ] Descarga instantánea de boletos
- [ ] Envío por email

### ✅ Staff
- [ ] Scan QR
- [ ] Validación en tiempo real
- [ ] Historial básico

### ✅ Director
- [ ] Crear organizadores
- [ ] Configurar comisiones
- [ ] Dashboard global
- [ ] Reenvío de boletos

### ✅ Core
- [ ] Reservación 2–5 min
- [ ] QR firmado
- [ ] Anti-duplicados
- [ ] Base de datos completa
- [ ] PDF generador
- [ ] Email delivery
