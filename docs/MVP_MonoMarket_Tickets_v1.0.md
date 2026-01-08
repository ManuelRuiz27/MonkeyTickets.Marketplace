# MVP – MonoMarket Tickets v1.0

## 0. Metadata
- Proyecto: **MonoMarket Tickets**
- Tipo: SaaS – Boletera Digital / Marketplace de Eventos
- Estado: MVP Definido
- Fecha: 2026-01
- Responsable: Dirección de Producto (Monosoft)

---

## 1. Problema a resolver

Los organizadores de eventos medianos y grandes necesitan vender boletos de forma digital, segura y rápida, sin depender de boleteras caras, lentas o con procesos complejos de alta.

**Dolores principales:**
- Comisiones altas y poco claras.
- Mala experiencia para el comprador.
- Falta de control en accesos.
- Dependencia de procesos manuales.

---

## 2. Objetivo del MVP

Lanzar una **boletera digital funcional** que permita:
- Publicar eventos
- Vender boletos en línea
- Cobrar mediante **Mercado Pago**
- Emitir boletos digitales con QR seguro
- Validar accesos en tiempo real

---

## 3. Alcance del MVP

### Incluye

#### Marketplace Público
- Listado de eventos públicos
- Búsqueda por:
  - Ciudad
  - Fecha
  - Categoría
  - Precio
- Página pública de evento

#### Checkout
- Compra sin registro obligatorio (modo invitado)
- Datos mínimos:
  - Nombre
  - Email
  - Teléfono
- Cálculo de totales **en backend**
- Pago con **Mercado Pago**:
  - Tarjeta
  - SPEI
  - OXXO

#### Boletos
- Generación de boleto digital en PDF
- QR dinámico firmado (JWT)
- Descarga desde navegador
- Reenvío por email
- Un QR = un acceso válido

#### Control de Acceso (Staff)
- App web / PWA de escaneo
- Acceso por token
- Validación en tiempo real
- Estados:
  - válido
  - ya usado
  - inválido

#### Organizador (Nivel A)
- Crear / editar eventos
- Definir:
  - Fecha
  - Lugar
  - Capacidad
  - Precio
- Ver ventas
- Ver compradores
- Descargar reportes básicos

#### Director (Administrador Global)
- Dashboard global:
  - Eventos activos
  - Tickets vendidos
  - Ingresos
- Gestión de organizadores
- Control de comisiones
- Visualización de órdenes y pagos
- Logs operativos y legales

---

### Excluye (fuera del MVP)

- OpenPay
- Stripe
- WhatsApp
- Landings personalizadas
- Préstamos / créditos
- Suscripciones
- Multi-moneda
- Eventos privados / ocultos
- Precampañas

---

## 4. Roles y Actores

### Comprador
- Compra boletos
- Descarga PDF
- Presenta QR

### Staff
- Escanea QR
- Valida acceso

### Organizador
- Gestiona eventos
- Consulta ventas

### Director
- Control total del sistema
- Métricas
- Finanzas

---

## 5. Flujo Funcional Principal

1. Organizador publica evento
2. Evento aparece en marketplace
3. Comprador selecciona boletos
4. Checkout → Mercado Pago
5. Pago confirmado
6. Sistema genera:
   - Orden
   - Boletos
   - QR
7. Comprador descarga boleto
8. Staff escanea en evento
9. Acceso validado

---

## 6. Modelo Financiero (MVP)

- **Pasarela única:** Mercado Pago
- Comisión MP aprox:
  - 3.5% + $4 MXN
- Ingreso principal:
  - Cargo por servicio al comprador
- Ganancia por boleto:
