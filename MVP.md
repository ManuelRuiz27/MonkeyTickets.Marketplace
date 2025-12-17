# Modelo Operativo del MVP

El sistema funciona como un **Marketplace pÃºblico** donde organizadores publican eventos y compradores adquieren boletos como invitados (sin necesidad de cuenta).

## 1. Modelos Activos y Desactivados

### Modelos activos en MVP:
- **Modelo A** â€” Eventos PÃºblicos
- **Modelo B** â€” Eventos Ocultos/Unlisted (link directo)

### Modelo desactivado:
- âŒ **Pre-campaÃ±as (Modelo C)**

---

## 2. MÃ³dulos incluidos en el MVP

### 2.1. MÃ³dulo del Organizador (Nivel A)

El organizador puede:

#### GestiÃ³n de Eventos
- Crear evento (nombre, fecha, horario, lugar, capacidad mÃ­nima 50 boletos)
- Editar evento
- Publicar/Despublicar evento
- Ver listado de eventos

#### Boletos
- Crear tipos de boletos (general, VIP, etc.)
- Definir precios + cargos por servicio aplicados automÃ¡ticamente
- Configurar capacidad/stock
- Subir plantilla PDF personalizada (opcional), si no usa la plantilla default
- Ver ventas y compradores

#### Ventas
- Ver detalle de Ã³rdenes
- Descargar boletos PDF del comprador (para reenviar manualmente si lo requiere)

#### QR dinÃ¡mico integrado
- QR firmado con JWT
- Incluye validaciones antifraude
- QR se valida desde mÃ³dulo Staff

---

### 2.2. MÃ³dulo del Comprador (Invitado)

**No necesita cuenta.**

#### Checkout
- Seleccionar boletos
- AÃ±adir datos requeridos:
  - Nombre
  - Email
  - TelÃ©fono
- Mostrar resumen del pedido (backend calcula totales)

#### Flujo de pago (modo prueba)\n- No hay pasarela integrada en este modo.\n- El checkout reserva los boletos y el organizador confirma o cancela manualmente segun el pago recibido fuera de la plataforma.\n\n#### Entrega de Boletos\n
- Descarga desde navegador
- EnvÃ­o por email
- **Sin WhatsApp. Sin SMS.**

---

### 2.3. MÃ³dulo Staff (Control de Accesos)

Acceso por token Ãºnico.

Incluye:
- Pantalla de escaneo QR
- ValidaciÃ³n en tiempo real contra backend
- SeÃ±ales visuales:
  - Verde â†’ vÃ¡lido
  - Rojo â†’ invÃ¡lido o repetido
- Historial bÃ¡sico de escaneos en la misma sesiÃ³n

---

### 2.4. MÃ³dulo Director (Superadmin)

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
- Revisar logs de Ã³rdenes y correos

**Sin prÃ©stamos. Sin crÃ©ditos.**

---

## 3. Funcionamiento de los Boletos

Cada boleto es un **PDF generado automÃ¡ticamente**.

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

### QR dinÃ¡mico firmado con expiraciÃ³n

### Validaciones antifraude:
- Firma JWT
- PrevenciÃ³n de duplicados
- Rate limit en `/scan/validate`

### Checkout antibots:
- CAPTCHAs opcionales
- ReservaciÃ³n temporal 2â€“5 min para evitar overselling

---

## 5. Reglas Comerciales

### Cargos por servicio
```
cargo_servicio = comisiÃ³n_base + impuestos
```
Ajustable por Director.

### CortesÃ­as (MVP)

Se mantienen, pero simples:
- Eventos <2500 personas â†’ 5 cortesÃ­as
- Eventos â‰¥2500 â†’ 330 cortesÃ­as
- CortesÃ­as adicionales pagan solo el cargo de servicio
- No pasan por pasarela
- Generan QR y PDF igual que un boleto pagado

---

## 6. TecnologÃ­a (MVP)

### Backend:
- NestJS (Fastify)
- PostgreSQL
- Prisma ORM
- Redis para locks y colas bÃ¡sicas
- Pagos manuales (sin pasarela)

### Frontend:
- React con Vite
- Tailwind
- Antigravity opcional (pregunto si los prompts son Codex o Gravity antes de generarlos)

---

## 7. Limitaciones del MVP

Conscientemente simplificado:

### No incluye:
- âŒ WhatsApp
- âŒ Landings animadas
- âŒ Flipbook premium
- âŒ PrÃ©stamos
- âŒ Ledger contable
- âŒ Afiliados
- âŒ Multi-organizador avanzado

### No se genera:
- âŒ Reportes PDF avanzados
- âŒ EstadÃ­sticas profundas
- âŒ Embudos de conversiÃ³n
- âŒ Notificaciones push

**Todo esto queda para V1.1 o V2.**

---

## 8. Checklist del MVP (para validar que estÃ¡ completo)

### âœ… Organizador
- [ ] Crear/editar/publicar eventos
- [ ] Crear tipos de boleto
- [ ] Subir plantilla PDF opcional
- [ ] Ver ventas y compradores
- [ ] Descargar boletos

### âœ… Checkout
- [ ] Calcular totales en backend
- [ ] Procesar pagos (Pagos manuales (sin pasarela))
- [ ] Descarga instantÃ¡nea de boletos
- [ ] EnvÃ­o por email

### âœ… Staff
- [ ] Scan QR
- [ ] ValidaciÃ³n en tiempo real
- [ ] Historial bÃ¡sico

### âœ… Director
- [ ] Crear organizadores
- [ ] Configurar comisiones
- [ ] Dashboard global
- [ ] ReenvÃ­o de boletos

### âœ… Core
- [ ] ReservaciÃ³n 2â€“5 min
- [ ] QR firmado
- [ ] Anti-duplicados
- [ ] Base de datos completa
- [ ] PDF generador
- [ ] Email delivery

