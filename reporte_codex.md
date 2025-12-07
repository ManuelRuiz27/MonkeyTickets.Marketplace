# Reporte Codex: Estado del MVP vs c√≥digo (MonoMarket-Ticket)

Fecha: 2025-12-06  
Base: `MVP.md` + c√≥digo en `apps/api`, `apps/web`, `apps/scanner`

---

## 1. Visi√≥n general

- El **backend (NestJS + Prisma)** implementa casi todo el modelo del MVP:
  - Modelo A (eventos p√∫blicos) y Modelo B (eventos ocultos/unlisted).
  - Checkout invitado, c√°lculo de totales en backend y reservas 5 minutos.
  - Tickets PDF con QR JWT firmado + antifraude b√°sico.
  - M√≥dulos Staff y Director con bastante l√≥gica de negocio ya lista.
  - Cortes√≠as conforme a reglas de capacidad.
- Los **principales huecos** est√°n en:
  - Autenticaci√≥n/autorizaci√≥n de organizador (endpoints con `x-organizer-id` + `TODO: add auth guard`).
  - Entrega de boletos por email (integraci√≥n real con SMTP/SendGrid a√∫n no hecha).
  - Alineaci√≥n real de pasarelas (MVP dice OpenPay principal; c√≥digo front/checkout est√° centrado en Mercado Pago).
  - Detalles de UI/UX en `apps/web` y `apps/scanner` para cerrar todos los flujos.

---

## 2. M√≥dulo Organizador

### Cobertura

- Modelos:
  - `Event` incluye capacidad, estado (`DRAFT/PUBLISHED/CANCELLED`), flags p√∫blico/unlisted, `maxTicketsPerPurchase`, campos de plantilla PDF (ruta y coords del QR).
  - `TicketTemplate` soporta `quantity`, `sold`, precio/currency, `isComplimentary`.
  - `Order`, `Ticket`, `Buyer`, `FeePlan` cubren ventas, compradores y comisiones.
- Gesti√≥n de eventos:
  - `apps/api/src/modules/organizer/events/*`:
    - Crear, listar, obtener, actualizar y cancelar eventos.
    - Asignar plantilla (`AssignTemplateDto`) a eventos.
  - Modelo A/B completado con:
    - `apps/api/src/modules/events/events.controller.ts` y `.service.ts`:
      - `/public/events`, `/public/events/search`, `/public/events/unlisted/:token`.
      - `POST /organizer/events/:id/access-token` genera token unlisted y URL.
- Tipos de boletos:
  - `apps/api/src/modules/organizer/templates/*`:
    - Crear/listar/eliminar plantillas de tickets por organizador.
- Plantilla PDF personalizada:
  - `POST /organizer/events/:id/pdf-template` guarda archivo en `uploads/pdf-templates` y actualiza coords QR.
  - `PdfGeneratorService` utiliza esa plantilla o hace fallback a plantilla default.
- Ventas/compradores:
  - `apps/api/src/modules/organizer/orders/*`:
    - Listar √≥rdenes por evento.
    - Ver detalle de orden y solicitar reenv√≠o de tickets.
  - Descarga de PDF individual disponible en `GET /tickets/:id/pdf`.

### Deficiencias / faltantes

- Seguridad Organizador:
  - En controllers de organizer (`events`, `templates`, `orders`) se usa `@Headers('x-organizer-id')` y se lanza:
    - `BadRequestException('Organizer context is required. TODO: add auth guard')`
  - Esto implica:
    - No se aplica realmente `JwtAuthGuard` + `RolesGuard` para ORGANIZER en estos endpoints.
    - Cualquiera podr√≠a forzar un `x-organizer-id` arbitrario ‚Üí riesgo de escalaci√≥n de privilegios.
- Descarga de boletos:
  - No hay un endpoint que devuelva **todos** los boletos de una orden en un paquete (ZIP o PDF concatenado), aunque `PdfGeneratorService.generateOrderTickets` existe.
  - Falta UI clara en `apps/web` para que el organizador:
    - Abra una orden.
    - Descargue/reenvi√© todos los tickets de esa orden.

---

## 3. M√≥dulo Comprador (Checkout invitado)

### Cobertura

- Sin cuenta, datos requeridos:
  - DTO `CreateCheckoutSessionDto` fuerza `eventId`, `tickets[]`, `name`, `email`, `phone`.
  - `CheckoutController` (`/checkout/session`) recibe datos y delega en `CheckoutService`.
  - `apps/web/src/pages/checkout/Checkout.tsx` implementa formulario para nombre, apellidos, email, tel√©fono.
- C√°lculo de totales en backend:
  - `CheckoutService.createCheckoutSession`:
    - Trae evento y valida que est√© `PUBLISHED` y no finalizado.
    - Junta plantillas (`TicketTemplate`) y calcula total en servidor.
    - Valida `maxTicketsPerPurchase` por evento.
    - Valida disponibilidad de stock contra `sold` + reservas activas en Redis.
- Reserva temporal 5 min:
  - `ReservationService` usa Redis:
    - Llaves `reservation:${eventId}:${templateId}` y `lock:${orderId}`.
    - TTL fijo 300s (5 min) para reserva, en l√≠nea con MVP (2‚Äì5 min).
    - `checkAvailability` considera `totalStock - sold - reserved`.
  - `CheckoutService` fija `reservedUntil` a 5 min en `Order`.
- Tickets PDF + descarga:
  - `PdfGeneratorService` genera PDFs con QR, datos de evento/comprador/tipo de boleto.
  - `GET /tickets/:id/pdf` expone descarga de un ticket individual.

### Pagos: desalineaci√≥n con MVP

- OpenPay:
  - Backend robusto en `apps/api/src/modules/payments/openpay/*`: controladores, servicios, webhooks.
  - Soporta tarjeta/SPEI/OXXO, pero no se ve integrado en el flujo principal de checkout del front.
- Mercado Pago:
  - Integraci√≥n en `apps/api/src/modules/payments/mercadopago/*`.
  - `CheckoutService` crea directamente un `Payment` con `gateway: 'MERCADOPAGO'`.
  - Front (`Checkout.tsx`) muestra:
    - `MercadoPagoButton` y `MercadoPagoCard`.
    - Comentario expl√≠cito: Openpay qued√≥ comentado para limitar el front a Mercado Pago.
- MVP vs c√≥digo:
  - MVP: OpenPay proveedor principal (tarjeta, SPEI, OXXO) y Mercado Pago solo para Google Pay / Apple Pay.
  - C√≥digo actual: checkout principal est√° orientado a Mercado Pago; OpenPay queda como backend legacy auxiliar.

### Entrega de boletos (email)

- `EmailService` (`apps/api/src/modules/email/email.service.ts`):
  - `sendTicketsEmail(orderId)`:
    - Carga orden + buyer + event + tickets.
    - Genera PDFs con `generateOrderTickets`.
    - Crea HTML y llama a `simulateSendEmail` (no env√≠a realmente).
    - Registra `EmailLog` con `status: 'SENT'`.
  - `sendPendingPaymentEmail` para OXXO/SPEI similarmente simulado.
- `MailService` (`apps/api/src/modules/mail/mail.service.ts`):
  - Tiene TODO: integrar proveedor SMTP usando `SMTP_*`.
  - Si no hay configuraci√≥n, solo loguea y crea `EmailLog` como `SENT`.

### Deficiencias / riesgos

- No hay env√≠o de correo real:
  - En producci√≥n, sin integrar SMTP/SendGrid, el sistema ‚Äúcree‚Äù que se enviaron correos porque se registran logs `SENT`, pero los usuarios no recibir√°n nada.
- Falta CAPTCHA/antibot:
  - MVP menciona ‚ÄúCheckout antibots: CAPTCHAs opcionales‚Äù.
  - No se encontr√≥ integraci√≥n con CAPTCHA en backend ni frontend.

---

## 4. M√≥dulo Staff (Control de accesos)

### Cobertura

- Modelo de sesi√≥n:
  - `StaffSession` (Prisma) guarda `organizerId`, `eventId`, `tokenHash`, expiraci√≥n, revocado, intentos fallidos.
  - `StaffService` crea y verifica tokens de sesi√≥n.
  - `StaffController`:
    - `POST /staff/sessions` (ORGANIZER crea sesi√≥n).
    - `GET /staff/sessions`, `DELETE /staff/sessions/:id`.
    - `POST /staff/sessions/verify` para que el scanner intercambie token por sesi√≥n activa.
- Validaci√≥n QR:
  - `PdfGeneratorService` genera JWT con `ticketId`, `orderId`, `eventId`, `templateId`, `buyerEmail`, `exp`.
  - URL de verificaci√≥n: `/api/tickets/verify/:token`.
  - `TicketsController`:
    - `GET /tickets/verify/:token` (protegido por `StaffAuthGuard`).
    - `POST /tickets/check-in/:qrCode` marca asistencia.
    - Usa `RateLimitService` para limitar frecuencias.
  - `TicketsService`:
    - `verifyTicketToken` valida JWT, compara `qrJwtHash` para evitar tokens obsoletos y calcula estado (`VALID`, `USED`, `CANCELLED`, `UNPAID`, `RESERVED`, `EXPIRED`).
    - `checkInTicket` cambia estado a `USED` y aumenta `Event.attendanceCount`.
- Front scanner:
  - `apps/scanner` contiene estructura de p√°ginas y servicios para consumir estas APIs; se asume que muestra estados visuales (verde/rojo) y algo de historial en la UI.

### Deficiencias

- JWT para QR se expira a 1 a√±o:
  - Negocio del MVP no lo proh√≠be, pero ser√≠a m√°s coherente alinear `exp` al fin del evento o una ventana corta post-evento.
- No se ha verificado en detalle el historial visual de escaneos en el front (pero el backend aporta datos suficientes).

---

## 5. M√≥dulo Director

### Cobertura

- Modelos:
  - `Role` incluye `DIRECTOR`.
  - `Organizer` tiene `feePlanId`, `status`, `complementaryTicketsUsed`.
  - `FeePlan` define fees de plataforma, gateway y cortes√≠as.
  - `LegalLog`, `EmailLog`, `WebhookLog` permiten auditor√≠a.
- Servicios:
  - `DirectorDashboardService`:
    - `getGlobalMetrics`: totales de organizadores, eventos, √≥rdenes y revenue (platformFees, organizersIncome, totalProcessed).
    - `listOrganizers`, `approveOrganizer`, `suspendOrganizer`.
    - `getOrderDetails` con buyer, event, organizer, items, payment, tickets, `emailLogs`.
    - `assignFeePlan` para comisiones personalizadas.
    - `resendTickets(orderId)`:
      - Valida orden pagada.
      - Crea `EmailLog` `PENDING` pero **no llama a EmailService** (solo simula).

### Deficiencias

- Reenv√≠o de boletos no funcional:
  - Director recibe mensaje de ‚ÄúTickets reenviados‚Äù pero no se realiza ning√∫n env√≠o real.
- Falta revisar c√°lculo efectivo de comisiones:
  - Estructura est√° lista, pero el c√°lculo real de `platformFeeAmount` y `organizerIncomeAmount` ocurre en servicios de pagos/webhooks; habr√≠a que confirmar que usa `FeePlan`.

---

## 6. Reglas comerciales y cortes√≠as

### Cortes√≠as

- `ComplimentaryTicketsService`:
  - `calculateAllowedCortesias(capacity)` ‚Üí 5 si `<2500`, 330 si `>=2500` (exacto al MVP).
  - `generateComplimentaryTickets`:
    - Verifica que evento pertenece al organizador.
    - Calcula cortes√≠as gratis vs cortes√≠as de pago (solo cargo de servicio usando `FeePlan.complementaryFee`).
    - Crea `Order` con `status: PAID`, `organizerIncomeAmount: 0`, `platformFeeAmount: totalCharge`.
    - Genera `TicketTemplate` `isComplimentary` y tickets con QR.
    - Actualiza contador `complementaryTicketsUsed`.

### Cargos por servicio

- Modelo `FeePlan` y referencias en `Organizer` est√°n listos.
- La l√≥gica principal de cargos parece delegada a servicios de pagos/webhooks (no se revis√≥ en detalle, pero la infraestructura existe).

---

## 7. Principales faltantes y recomendaciones

### 7.1 Plan de acci√≥n operativo (resumen)

- **OBJ-SEC-01 ‚Äì Seguridad Organizer (M)**  
  Proteger todos los endpoints de `organizer/*` con `JwtAuthGuard` + `RolesGuard` y dejar de usar `x-organizer-id` como fuente de verdad. Archivos clave: `organizer-*-controller.ts`, `auth/*`, `apps/web/src/api/client.ts`.

- **EMAIL-01 ‚Äì Email real + reenv√≠os (M)**  
  Implementar un adaptador SMTP en `MailService`, centralizar el env√≠o/reenv√≠o en `EmailService` y conectar `DirectorDashboardService.resendTickets` y `OrganizerOrdersService.resendTickets` a esa capa. Archivos clave: `mail.service.ts`, `email.service.ts`, `director-dashboard.service.ts`, `organizer-orders.service.ts`, `.env*`.

- **PAY-ALIGN-01 ‚Äì Estrategia de pasarela (M)**  
  Tomar una decisi√≥n expl√≠cita (OpenPay vs Mercado Pago como gateway principal), actualizar `MVP.md`/`Sprint_MP` y alinear `CheckoutService` + `Checkout.tsx` y componentes de m√©todos de pago con esa estrategia.

- **ABOT-01 ‚Äì Checkout antibot (M)**  
  A√±adir un CAPTCHA opcional en el formulario de checkout, validarlo en `/checkout/session` y, si es necesario, complementar con rate limiting espec√≠fico para ese endpoint. Archivos clave: `Checkout.tsx`, `checkout.controller.ts`, `rate-limit.service.ts`.

- **QR-EXP-01 ‚Äì Pol√≠tica de expiraci√≥n de QR (S/M)**  
  Ajustar el `exp` del JWT del QR en `pdf-generator.service.ts` para que dependa de la fecha del evento (p.ej. fin de evento + X horas) y documentar claramente esa pol√≠tica en el c√≥digo y/o `MVP.md`.

- **UX-01 ‚Äì Pulido UX web + scanner (M/L)**  
  Recorrer end-to-end los flujos de marketplace, panel de organizador, panel de director y app de scanner, ajustando pantallas, textos y llamadas al backend para que reflejen el comportamiento real (roles, email, pagos, estados de tickets).

1. **Seguridad endpoints de Organizer**
   - Implementar `JwtAuthGuard` + `RolesGuard` en controllers de organizer.
   - Derivar `organizerId` del usuario autenticado en lugar de `x-organizer-id`.

2. **Email real y reenv√≠os**
   - Integrar proveedor (SMTP/SendGrid/Resend) en `MailService`.
   - Ajustar `EmailService` para usar esa capa y registrar correctamente `EmailLog` (SENT/FAILED).
   - Conectar `DirectorDashboardService.resendTickets` y flujos de Organizer para que invoquen `EmailService`.

3. **Alinear modelo de pasarela con el MVP**
   - Decidir si el MVP se actualiza a ‚ÄúMercado Pago principal‚Äù o si se debe reactivar OpenPay como gateway central.
   - Adaptar `CheckoutService` y `apps/web/src/pages/checkout/Checkout.tsx` para seleccionar gateway seg√∫n m√©todo (tarjeta/SPEI/OXXO vs wallets).

4. **CAPTCHA / antibot en checkout**
   - A√±adir un CAPTCHA opcional en el front y validarlo en `/checkout/session`.

5. **Ajustar expiraci√≥n del QR**
   - Hacer que `exp` del JWT se relacione con la fecha del evento o pol√≠ticas de negocio.

6. **Completar UX en web/scanner**
   - Verificar y pulir:
     - Marketplace p√∫blico y acceso unlisted.
     - Panel de organizador (eventos, templates, √≥rdenes, descarga y reenv√≠o de boletos).
     - Panel de director (m√©tricas, comisiones, auditor√≠a).
     - UI de scanner (se√±ales verde/rojo, historial de escaneos en sesi√≥n).

En resumen, el proyecto tiene **muy buena cobertura del dominio del MVP en backend**, con reglas de negocio y modelo de datos s√≥lidos. Para considerar el MVP completamente listo faltan, sobre todo, cierres de seguridad, integraci√≥n de correo real, alineaci√≥n de pasarelas y pulido de la experiencia completa en el frontend para organizador, comprador, staff y director.

7. **Seguridad / limpieza pendiente (OBJ-SEC-02)**
   - Revisar configuraciones de CORS y cabeceras custom (x-organizer-id, etc.) para limpiar aquello que ya no se usa como fuente de verdad y reducir superficie de ataque.
   - Asegurar que no se exponen detalles internos en mensajes de error (stack traces, nombres de tablas) y que las respuestas 4xx/5xx hacia el frontend son genÈricas pero accionables.
   - Documentar un checklist mÌnimo de hardening (rotaciÛn de tokens staff, expiraciÛn de sesiones, uso de HTTPS obligatorio en entornos p˙blicos).

8. **AlineaciÛn completa de pagos (PAY-ALIGN-02)**
   - Verificar que el backend registra consistentemente el gateway y mÈtodo de pago usado (Payment.gateway, Payment.paymentMethod) tanto para Mercado Pago como para OpenPay (tarjeta, SPEI, OXXO, wallets).
   - Alinear los flujos de CheckoutService y de webhooks para que el estado final de Order y Payment refleje exactamente lo que ocurriÛ en la pasarela (aprobado, pendiente, rechazado, reembolsado).
   - Revisar que las comisiones (FeePlan, platformFeeAmount, organizerIncomeAmount) se calculan con la misma fÛrmula independientemente del gateway seleccionado.

9. **Observabilidad y operaciÛn (LOG-MON-01)**
   - Aprovechar LegalLog y WebhookLog para construir una vista operativa mÌnima (p·gina interna o queries predefinidas) que permita depurar pagos, webhooks y envÌos de correo sin ir directamente a la base de datos.
   - Definir niveles de log (info/warn/error) coherentes en servicios crÌticos (payments, webhooks, 	ickets, email) para facilitar el soporte en producciÛn.
   - Opcional: integrar una soluciÛn ligera de monitoreo/alertas para detectar caÌdas de pasarela, errores masivos de email o problemas de rendimiento.

10. **QA y pruebas end-to-end (QA-01)**
    - Revisar y mantener actualizados los tests unitarios y de integraciÛn existentes para pagos (MP y OpenPay), tickets y email, asegurando que cubren los flujos principales del MVP.
    - Consolidar un set de casos manuales E2E (organizador crea evento, comprador compra, recibe boletos, staff escanea, director revisa) que se corran antes de cada despliegue relevante.
    - Si es posible, automatizar parte de estos flujos con Playwright u otra herramienta, al menos para el checkout completo y el escaneo b·sico.

7. **Seguridad / limpieza pendiente (OBJ-SEC-02)**
   - Revisar configuraciones de CORS y cabeceras custom (x-organizer-id, etc.) para limpiar aquello que ya no se usa como fuente de verdad y reducir superficie de ataque.
   - Asegurar que no se exponen detalles internos en mensajes de error (stack traces, nombres de tablas) y que las respuestas 4xx/5xx hacia el frontend son genÈricas pero accionables.
   - Auditar variables de entorno en archivos de configuraciÛn (.env, .env.local) y despliegues para evitar secretos huÈrfanos o claves de sandbox en producciÛn.
   - Documentar un checklist mÌnimo de hardening (rotaciÛn de tokens staff, expiraciÛn de sesiones, uso de HTTPS obligatorio en entornos p˙blicos).

8. **AlineaciÛn completa de pagos (PAY-ALIGN-02)**
   - Verificar que el backend registra consistentemente el gateway y mÈtodo de pago usado (Payment.gateway, Payment.paymentMethod) tanto para Mercado Pago como para OpenPay (tarjeta, SPEI, OXXO, wallets).
   - Alinear los flujos de CheckoutService y de webhooks para que el estado final de Order y Payment refleje exactamente lo que ocurriÛ en la pasarela (aprobado, pendiente, rechazado, reembolsado).
   - Revisar que las comisiones (FeePlan, platformFeeAmount, organizerIncomeAmount) se calculan con la misma fÛrmula independientemente del gateway seleccionado.

9. **Observabilidad y operaciÛn (LOG-MON-01)**
   - Aprovechar LegalLog y WebhookLog para construir una vista operativa mÌnima (p·gina interna o queries predefinidas) que permita depurar pagos, webhooks y envÌos de correo sin ir directamente a la base de datos.
   - Definir niveles de log (info/warn/error) coherentes en servicios crÌticos (payments, webhooks, tickets, email) para facilitar el soporte en producciÛn.
   - Opcional: integrar una soluciÛn ligera de monitoreo/alertas para detectar caÌdas de pasarela, errores masivos de email o problemas de rendimiento.

10. **QA y pruebas end-to-end (QA-01)**
    - Revisar y mantener actualizados los tests unitarios y de integraciÛn existentes para pagos (MP y OpenPay), tickets y email, asegurando que cubren los flujos principales del MVP.
    - Consolidar un set de casos manuales E2E (organizador crea evento, comprador compra, recibe boletos, staff escanea, director revisa) que se corran antes de cada despliegue relevante.
    - Si es posible, automatizar parte de estos flujos con Playwright u otra herramienta, al menos para el checkout completo y el escaneo b·sico.

**Estado actual OBJ-SEC-02 (implementado en cÛdigo)**
- CORS actualizado para eliminar x-organizer-id como cabecera permitida y reducir superficie de ataque innecesaria.
- Filtro global de excepciones (AllExceptionsFilter) que captura errores no controlados, los loguea con detalle en servidor y responde al cliente con un mensaje genÈrico sin stack ni detalles internos.
- Controladores de tickets actualizados para no reenviar error.message crudo al cliente (solo se propagan HttpException de dominio; el resto se traduce a mensajes genÈricos).
- EnvValidationService ya valida JWT_SECRET fuerte, URLs de BD/Redis, credenciales de Openpay/Mercado Pago y URLs API/FRONTEND en arranque, evitando entornos mal configurados en producciÛn.
- **Estado actual PAY-ALIGN-02 (parcialmente alineado)**
  - Los pagos de Mercado Pago mantienen gateway = MERCADOPAGO y paymentMethod seg˙n el mÈtodo (card, google_pay, pple_pay, spei, oxxo), mientras que los de OpenPay quedan claramente diferenciados por gateway = OPENPAY y mÈtodo correspondiente.
  - Pendiente futuro: considerar mover la creaciÛn inicial de Payment fuera de CheckoutService y dejar que cada gateway cree su propio registro (MP: PaymentsService/MercadoPagoService, OpenPay: servicios de cargo y webhooks), para evitar defaults engaÒosos incluso de forma transitoria.

- **Estado actual PAY-ALIGN-02 (parcialmente alineado)**
  - CheckoutService sigue creando un registro Payment inicial con gateway MERCADOPAGO para todas las Ûrdenes, pero ahora los flujos de OpenPay (tarjeta, SPEI y OXXO) hacen upsert sobre ese registro y corrigen los campos: gateway=OPENPAY, paymentMethod='card'|'spei'|'oxxo', gatewayTransactionId=id de cargo OpenPay y status=PENDING hasta que el webhook marque el estado final.
  - Los pagos de Mercado Pago mantienen gateway=MERCADOPAGO y paymentMethod seg˙n el mÈtodo (card, google_pay, apple_pay, spei, oxxo), mientras que los de OpenPay quedan claramente diferenciados por gateway=OPENPAY y mÈtodo correspondiente.
  - Pendiente futuro: considerar mover la creaciÛn inicial de Payment fuera de CheckoutService y dejar que cada gateway cree su propio registro (MP: PaymentsService/MercadoPagoService, OpenPay: servicios de cargo y webhooks), para evitar defaults engaÒosos incluso de forma transitoria.

**Estado actual LOG-MON-01 (implementado en backend)**
- Nuevo controlador DirectorLogsController (/director/logs/*) protegido con JwtAuthGuard + RolesGuard (rol DIRECTOR), que expone:**
  - GET /director/logs/webhooks?gateway=mercadopago|openpay&limit=50: lista WebhookLog recientes para depurar webhooks de MP/Openpay sin ir directo a la BD.
  - GET /director/logs/legal?action=PAYMENT_WEBHOOK|MP_WEBHOOK_IGNORED|PAYMENT_WEBHOOK_NOT_FOUND&limit=50: lista LegalLog recientes relacionados con pagos/auditorÌa.
- Ya existÌa GET /director/orders/:orderId/logs que devuelve logs legales y de correo (LegalService.findLogsByOrder); ahora queda como vista de detalle por orden, complementada por las vistas globales de logs.
- Los mÛdulos de pagos/webhooks ya usan niveles de log coherentes (log para eventos normales, warn para condiciones sospechosas como firmas inv·lidas o webhooks duplicados, error para fallas de procesamiento), y el filtro global de excepciones se encarga de no exponer detalles internos al cliente.

**Estado actual PAY-ALIGN-01/02 (backend y UX)**
- CheckoutService dejÛ de crear un Payment inicial con gateway MERCADOPAGO para todas las Ûrdenes: ahora los pagos se registran exclusivamente cuando el comprador elige pasarela/mÈtodo (MP u Openpay).
- Para Mercado Pago: PaymentsService y MercadoPagoService son los ˙nicos que crean/actualizan Payment con gateway = MERCADOPAGO, paymentMethod seg˙n el mÈtodo (card, google_pay, pple_pay, spei, oxxo) y gatewayTransactionId set al id de pago/preferencia devuelto por MP; los webhooks (PaymentsWebhooksService) actualizan estado y montos (fees e ingreso organizer) de forma idempotente.
- Para Openpay: los servicios de cargo (OpenpayService para tarjeta, OpenpayAlternativePaymentsService para SPEI/OXXO) hacen upsert de Payment por orderId con gateway = OPENPAY, paymentMethod = 'card'|'spei'|'oxxo', gatewayTransactionId = id de cargo Openpay y status = PENDING hasta que el webhook marque el estado final.
- Webhooks Openpay (OpenpayWebhookController) marcan la orden PAID/CANCELLED y actualizan Payment.status a COMPLETED/FAILED manteniendo el gatewayTransactionId del cargo; adem·s, generan tickets, actualizan sold en templates y envÌan los boletos por email, alineados con el flujo de MP.
- Validaciones de entorno reforzadas: en producciÛn ahora se exige OPENPAY_PRIVATE_KEY y OPENPAY_WEBHOOK_SECRET adem·s de OPENPAY_MERCHANT_ID/OPENPAY_API_KEY para evitar despliegues con configuraciÛn de pagos incompleta.

**Estado actual QR-EXP-01/02 (implementado)**
- El QR deja de depender de un exp fijo de 1 aÒo: la expiraciÛn efectiva se calcula en backend a partir de las fechas del evento (event.startDate / event.endDate).
- TicketsService.computeTicketStatus marca el ticket como EXPIRED cuando se cumple la ventana de tiempo definida: fin de evento + 12 h si existe endDate, o inicio + 24 h si solo hay startDate; si no hay fechas v·lidas, se usa un fallback de ~90 dÌas.
- PdfGeneratorService.verifyTicketQR ignora el exp del JWT y delega la expiraciÛn al c·lculo de negocio, evitando depender de tokens antiguos o generados con polÌticas viejas.
- checkInTicket ahora impide registrar entrada cuando el evento ya saliÛ de su ventana temporal (misma regla que computeTicketStatus), devolviendo un error claro al staff (Ticket expired for this event).

**Estado actual QA-01 (plan de pruebas E2E)**
- Pruebas unitarias e integraciÛn: pagos (MP/Openpay), tickets y email ya cuentan con buena cobertura en Jest; antes de cada despliegue relevante se recomienda ejecutar el paquete de tests backend y revisar especialmente los mÛdulos de payments, webhooks, 	ickets y email.
- Flujo E2E 1 ñ Compra con Mercado Pago (tarjeta/Wallet):
  1. Organizador crea evento p˙blico con al menos 1 tipo de boleto y lo publica.
  2. Comprador entra al marketplace, selecciona el evento, completa checkout invitado y paga con MP (card o wallet).
  3. Verificar en backend que Order pasa a PAID, Payment.gateway = MERCADOPAGO, Payment.status = COMPLETED, tickets se generan y EmailLog registra envÌo SENT.
  4. Staff escanea el QR en la app scanner: primer escaneo debe marcar VALID y permitir check-in; segundo escaneo debe devolver USED y bloquearlo.
- Flujo E2E 2 ñ Compra con Openpay (tarjeta, SPEI, OXXO):
  1. Organizador crea evento y lo publica; comprador realiza checkout seleccionando Openpay (card / SPEI / OXXO) desde las pestaÒas de mÈtodos de pago.
  2. Verificar que el cargo se cree en Openpay por el total de la orden y que Payment.gateway = OPENPAY, paymentMethod corresponda (card/spei/oxxo) y status = PENDING hasta que llegue el webhook de charge.succeeded.
  3. Tras webhook exitoso, comprobar que la orden pasa a PAID, tickets se generan y se envÌa email de confirmaciÛn.
- Flujo E2E 3 ñ Eventos unlisted y expiraciÛn de QR:
  1. Organizador marca un evento como unlisted y copia el enlace generado; comprador accede mediante esa URL y completa la compra.
  2. Staff escanea tickets durante el evento (deben ser VALID) y vuelve a intentar varios dÌas despuÈs de la fecha de fin: los tickets deben regresar EXPIRED y checkInTicket debe rechazar el ingreso.
- Flujo E2E 4 ñ Director y observabilidad:
  1. Director inicia sesiÛn, navega a /director/orders y busca la orden del flujo anterior; revisa detalle de orden y logs (/director/orders/:id/logs).
  2. Director accede a /director/logs y filtra por gateway=mercadopago/openpay y ction=PAYMENT_WEBHOOK para revisar trazas de webhooks y LegalLog asociados.
- Pendiente futuro: parametrizar estos flujos en Playwright u otra herramienta E2E (aprovechando la guÌa de Sprint_MP) para automatizar al menos: checkout completo (MP + Openpay), recepciÛn de correo con tickets (dummy o real seg˙n entorno) y escaneo b·sico en la app de scanner.
