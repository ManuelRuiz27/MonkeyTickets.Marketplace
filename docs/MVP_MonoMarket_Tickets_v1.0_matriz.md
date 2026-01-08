# Matriz de cumplimiento - MVP MonoMarket Tickets v1.0

Actualizado: 2026-01-08

Leyenda de estado: Cumple | Parcial | Pendiente

## Marketplace publico

| Feature | Estado | Evidencia |
| --- | --- | --- |
| Listado de eventos publicos | Cumple | `apps/api/src/modules/events/events.controller.ts`, `apps/web/src/pages/marketplace/EventList.tsx` |
| Busqueda por ciudad/fecha/categoria/precio | Cumple | `apps/api/src/modules/events/events.service.ts`, `apps/web/src/components/marketplace/EventFilters.tsx`, `apps/web/src/api/client.ts` |
| Pagina publica de evento | Cumple | `apps/web/src/pages/marketplace/EventDetail.tsx` |

## Checkout

| Feature | Estado | Evidencia |
| --- | --- | --- |
| Compra sin registro (guest) | Cumple | `apps/api/src/modules/checkout/checkout.controller.ts`, `apps/web/src/pages/checkout/Checkout.tsx` |
| Datos minimos (nombre/email/telefono) | Cumple | `apps/api/src/modules/checkout/dto/create-checkout-session.dto.ts`, `apps/web/src/pages/checkout/Checkout.tsx` |
| Calculo de totales en backend | Cumple | `apps/api/src/modules/checkout/checkout.service.ts` |
| Pago con Mercado Pago (tarjeta/SPEI/OXXO) | Cumple | `apps/api/src/modules/checkout/payment.service.ts` |
| Webhook MP y estados de pago | Cumple | `apps/api/src/modules/checkout/checkout.controller.ts`, `apps/api/src/modules/checkout/checkout.service.ts` |

## Boletos

| Feature | Estado | Evidencia |
| --- | --- | --- |
| Generacion de PDF | Cumple | `apps/api/src/modules/tickets/pdf-generator.service.ts` |
| QR dinamico firmado (JWT) | Cumple | `apps/api/src/modules/tickets/pdf-generator.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts` |
| Descarga desde navegador | Cumple | `apps/api/src/modules/tickets/tickets.controller.ts`, `apps/web/src/pages/checkout/CheckoutSuccess.tsx` |
| Reenvio por email | Cumple | `apps/api/src/modules/email/email.service.ts`, `apps/api/src/modules/organizer/orders/organizer-orders.controller.ts` |
| Un QR = un acceso valido | Cumple | `apps/api/src/modules/tickets/tickets.service.ts` |

## Control de acceso (staff)

| Feature | Estado | Evidencia |
| --- | --- | --- |
| App web/PWA de escaneo | Cumple | `apps/scanner/src` |
| Acceso por token | Cumple | `apps/api/src/modules/staff/guards/staff-auth.guard.ts`, `apps/scanner/src` |
| Validacion en tiempo real | Cumple | `apps/api/src/modules/tickets/tickets.controller.ts` |
| Estados valido/usado/invalido | Cumple | `apps/api/src/modules/tickets/tickets.service.ts` |

## Organizador (nivel A)

| Feature | Estado | Evidencia |
| --- | --- | --- |
| Crear/editar eventos | Cumple | `apps/api/src/modules/organizer/events/organizer-events.service.ts`, `apps/web/src/pages/organizer/Events.tsx` |
| Definir fecha/lugar/capacidad/precio | Cumple | `apps/api/src/modules/organizer/events/organizer-events.service.ts`, `apps/web/src/pages/organizer/EditEvent.tsx` |
| Ver ventas | Cumple | `apps/api/src/modules/organizer/orders/organizer-orders.service.ts`, `apps/web/src/pages/organizer/Sales.tsx` |
| Ver compradores | Cumple | `apps/api/src/modules/organizer/orders/organizer-orders.service.ts` |
| Descargar reportes basicos | Cumple | `apps/web/src/pages/organizer/Sales.tsx` |

## Director

| Feature | Estado | Evidencia |
| --- | --- | --- |
| Dashboard global (eventos activos, tickets vendidos, ingresos) | Cumple | `apps/api/src/modules/director/director-dashboard.service.ts`, `apps/web/src/pages/director/Dashboard.tsx` |
| Gestion de organizadores | Cumple | `apps/api/src/modules/director/dashboard.controller.ts`, `apps/web/src/pages/director/Organizers.tsx` |
| Control de comisiones | Cumple | `apps/api/src/modules/director/director-dashboard.service.ts`, `apps/web/src/pages/director/Organizers.tsx` |
| Visualizacion de ordenes y pagos | Cumple | `apps/api/src/modules/director/director-dashboard.service.ts`, `apps/web/src/pages/director/Orders.tsx` |
| Logs operativos y legales | Cumple | `apps/api/src/director/legal.controller.ts`, `apps/web/src/pages/director/OrderDetail.tsx` |

## Finanzas/Core

| Feature | Estado | Evidencia |
| --- | --- | --- |
| Comision MP + fee de plataforma calculados | Cumple | `apps/api/src/modules/checkout/checkout.service.ts` |
