# 📖 Historias de Usuario - MonoMarket Tickets V2

**Proyecto:** MonoMarket Tickets V2 - Sistema Nightclub  
**Formato:** Ágil (Scrum)  
**Sprint Planning:** Q1 2025  

---

## 📋 Índice de Épicas

1. [Epic 1: Gestión de RPs](#epic-1-gestión-de-rps)
2. [Epic 2: Sistema de Tipos de Invitados](#epic-2-sistema-de-tipos-de-invitados)
3. [Epic 3: Generación de Tickets](#epic-3-generación-de-tickets)
4. [Epic 4: Landing Pública RP](#epic-4-landing-pública-rp)
5. [Epic 5: Analytics y Dashboard](#epic-5-analytics-y-dashboard)
6. [Epic 6: Scanner Enhanced](#epic-6-scanner-enhanced)

---

## Epic 1: Gestión de RPs

### HU-001: Crear Usuario RP

**Como** organizador  
**Quiero** registrar a un RP en mi sistema  
**Para** que pueda generar tickets de cortesía para el evento

#### Criterios de Aceptación

```gherkin
Feature: Crear RP

  Scenario: Crear RP exitosamente
    Given estoy autenticado como organizador
    And tengo un evento publicado
    When ingreso email "rp@example.com", nombre "Juan RP" y límite 50
    And hago click en "Crear RP"
    Then se crea un usuario con role "RP"
    And se crea un RPProfile asociado al evento
    And el RP recibe email con credenciales temporales
    And veo el RP en la lista con estado "ACTIVO"

  Scenario: Email duplicado
    Given existe un RP con email "rp@example.com"
    When intento crear otro RP con el mismo email
    Then veo error "Este email ya está registrado"
    And no se crea el usuario

  Scenario: Límite inválido
    Given estoy creando un RP
    When ingreso límite de tickets negativo
    Then veo error "El límite debe ser mayor a 0 o ilimitado"
```

#### Tareas Técnicas

- [ ] Endpoint POST `/api/organizer/rp/create`
- [ ] Validación de email único
- [ ] Generación de password temporal
- [ ] Template email de bienvenida
- [ ] UI: Modal de creación de RP

#### Definición de Hecho (DoD)

- [x] Tests unitarios pasando (service)
- [x] Tests E2E pasando (happy path)
- [ ] Documentación API actualizada
- [ ] UI responsive mobile/desktop
- [ ] Code review aprobado

**Story Points:** 5  
**Prioridad:** Alta  
**Dependencies:** Ninguna  
**Sprint:** Sprint 1

---

### HU-002: Desactivar RP

**Como** organizador  
**Quiero** desactivar temporalmente a un RP  
**Para** que no pueda generar más tickets sin eliminarlo del sistema

#### Criterios de Aceptación

```gherkin
Feature: Desactivar RP

  Scenario: Desactivar RP activo
    Given tengo un RP con estado "ACTIVO"
    When hago click en "Desactivar"
    Then el estado cambia a "INACTIVO"
    And su link público muestra mensaje "RP desactivado"
    And no puede autenticarse
    And sus tickets existentes siguen siendo válidos

  Scenario: Reactivar RP
    Given tengo un RP con estado "INACTIVO"
    When hago click en "Activar"
    Then el estado cambia a "ACTIVO"
    And puede autenticarse nuevamente
```

#### Tareas Técnicas

- [ ] Endpoint PATCH `/api/organizer/rp/{id}/toggle-status`
- [ ] Validación en login (bloquear si inactivo)
- [ ] Validación en endpoints públicos
- [ ] UI: Toggle switch en lista de RPs

**Story Points:** 3  
**Prioridad:** Media  
**Dependencies:** HU-001  
**Sprint:** Sprint 1

---

### HU-003: Editar Límite de Tickets

**Como** organizador  
**Quiero** ajustar el límite de tickets de un RP  
**Para** recompensar buen desempeño o controlar excesos

#### Criterios de Aceptación

```gherkin
Feature: Editar límite de tickets

  Scenario: Aumentar límite
    Given un RP tiene límite de 50 tickets y ha generado 40
    When cambio su límite a 100
    Then puede generar 60 tickets más
    And se registra en audit log

  Scenario: Reducir límite por debajo de generados
    Given un RP tiene límite de 50 y ha generado 40
    When intento cambiar límite a 30
    Then veo advertencia "El RP ya generó 40 tickets"
    And puedo confirmar de todos modos
    And no podrá generar más tickets

  Scenario: Hacer límite ilimitado
    Given un RP tiene límite de 50
    When marco checkbox "Ilimitado"
    Then el límite se guarda como NULL
    And puede generar sin restricción
```

**Story Points:** 3  
**Prioridad:** Media  
**Dependencies:** HU-001  
**Sprint:** Sprint 2

---

## Epic 2: Sistema de Tipos de Invitados

### HU-004: Crear Tipo de Invitado

**Como** organizador  
**Quiero** definir tipos de invitados personalizados  
**Para** diferenciar VIPs, Influencers y Prensa en mi evento

#### Criterios de Aceptación

```gherkin
Feature: Crear tipo de invitado

  Scenario: Crear tipo VIP
    Given estoy en la sección "Tipos de Invitado"
    When ingreso:
      | Campo         | Valor          |
      | Nombre        | VIP            |
      | Color         | #FFD700        |
      | Ícono         | 👑             |
      | Show Nickname | Sí             |
      | Orden         | 1              |
    And hago click en "Guardar"
    Then se crea el tipo
    And aparece en el dropdown de generación de tickets
    And el preview muestra el badge con color dorado

  Scenario: Nombre duplicado en el evento
    Given existe un tipo "VIP"
    When intento crear otro tipo "VIP"
    Then veo error "Ya existe un tipo con este nombre"
```

#### Tareas Técnicas

- [ ] Modelo `GuestType` en Prisma
- [ ] Endpoint POST `/api/events/{id}/guest-types`
- [ ] Unique constraint `eventId + name`
- [ ] UI: Color picker component
- [ ] UI: Emoji selector
- [ ] Preview component con badges

**Story Points:** 5  
**Prioridad:** Alta  
**Dependencies:** Ninguna  
**Sprint:** Sprint 1

---

### HU-005: Ordenar Tipos de Invitado

**Como** organizador  
**Quiero** definir el orden de visualización de los tipos  
**Para** que los más importantes aparezcan primero

#### Criterios de Aceptación

```gherkin
Feature: Ordenar tipos

  Scenario: Reordenar con drag and drop
    Given tengo tipos: VIP (1), Influencer (2), Prensa (3)
    When arrastro "Influencer" a la primera posición
    Then el orden queda: Influencer (1), VIP (2), Prensa (3)
    And se actualiza automáticamente
    And el dropdown refleja el nuevo orden
```

**Story Points:** 3  
**Prioridad:** Baja  
**Dependencies:** HU-004  
**Sprint:** Sprint 3

---

## Epic 3: Generación de Tickets

### HU-006: Login de RP

**Como** RP  
**Quiero** autenticarme en el sistema  
**Para** acceder a mi dashboard y generar tickets

#### Criterios de Aceptación

```gherkin
Feature: Login RP

  Scenario: Login exitoso
    Given tengo credenciales válidas
    When ingreso email "rp@example.com" y password "securepass"
    And hago click en "Iniciar Sesión"
    Then recibo un JWT token
    And soy redirigido a "/rp/dashboard"
    And veo mi nombre y evento en el header

  Scenario: Credenciales incorrectas
    When ingreso password incorrecto
    Then veo error "Email o contraseña incorrectos"
    And permanezco en la página de login

  Scenario: RP desactivado
    Given mi perfil RP está inactivo
    When intento autenticarme
    Then veo error "Tu cuenta está desactivada. Contacta al organizador"
```

#### Tareas Técnicas

- [ ] Página `/rp/login`
- [ ] AuthGuard con role verification
- [ ] JWT strategy actualizada
- [ ] Persistencia de token en localStorage
- [ ] UI: Form con branding del evento

**Story Points:** 5  
**Prioridad:** Alta  
**Dependencies:** HU-001  
**Sprint:** Sprint 1

---

### HU-007: Generar Ticket Individual (Dashboard)

**Como** RP autenticado  
**Quiero** generar un ticket para un invitado  
**Para** darle acceso al evento

#### Criterios de Aceptación

```gherkin
Feature: Generar ticket

  Scenario: Generar ticket VIP con nickname
    Given estoy autenticado como RP
    And tengo 15/50 tickets generados
    When abro el modal "Generar Ticket"
    And selecciono tipo "VIP"
    And ingreso nickname "El Padrino"
    And cantidad 1
    And hago click en "Generar"
    Then se crea 1 ticket con status VALID
    And el QR tiene formato "RP-{uuid}"
    And el ticket está asociado a mi RPProfile
    And mi contador incrementa a 16/50
    And veo toast "✅ 1 ticket generado"

  Scenario: Límite alcanzado
    Given tengo 50/50 tickets generados
    When intento generar otro ticket
    Then veo error "Límite alcanzado"
    And el botón "Generar" está deshabilitado

  Scenario: Tipo sin nickname
    Given selecciono tipo "Influencer" (showNickname=false)
    Then el campo nickname no es visible
    And puedo generar sin nickname
```

#### Tareas Técnicas

- [ ] Endpoint POST `/api/rp/tickets/generate`
- [ ] Service: `generateGuestTicket()`
- [ ] Validación de límites
- [ ] Generación de QR con prefijo `RP-`
- [ ] UI: Modal con preview
- [ ] Toast notifications

**Story Points:** 8  
**Prioridad:** Alta  
**Dependencies:** HU-004, HU-006  
**Sprint:** Sprint 2

---

### HU-008: Generar Tickets en Lote

**Como** RP  
**Quiero** generar múltiples tickets a la vez  
**Para** ahorrar tiempo cuando traigo un grupo

#### Criterios de Aceptación

```gherkin
Feature: Generación en lote

  Scenario: Generar 5 tickets VIP
    Given tengo 10/50 tickets generados
    When selecciono tipo "VIP"
    And ingreso cantidad 5
    And hago click en "Generar"
    Then se crean 5 tickets
    And todos tienen el mismo guestTypeId
    And todos tienen QRs únicos
    And mi contador incrementa a 15/50
    And veo toast "✅ 5 tickets generados"

  Scenario: Cantidad excede límite
    Given tengo 45/50 tickets
    When intento generar 10 tickets
    Then veo error "Solo puedes generar 5 tickets más"
    And el campo cantidad muestra max=5

  Scenario: Máximo 10 por generación
    When ingreso cantidad 15
    Then veo validación "Máximo 10 tickets por generación"
```

**Story Points:** 5  
**Prioridad:** Media  
**Dependencies:** HU-007  
**Sprint:** Sprint 2

---

## Epic 4: Landing Pública RP

### HU-009: Ver Info del Evento (Landing Pública)

**Como** invitado  
**Quiero** ver información del evento antes de registrarme  
**Para** decidir si quiero el boleto

#### Criterios de Aceptación

```gherkin
Feature: Landing pública

  Scenario: Acceder a link de RP activo
    Given un RP tiene código "ABC123"
    And está activo
    When accedo a "/rp/ABC123/ticket"
    Then veo:
      | Elemento       | Valor                     |
      | Título         | Evento de Año Nuevo 2025  |
      | Fecha          | 31 de Diciembre 2025      |
      | Hora           | 22:00 hrs                 |
      | Lugar          | Nightclub XYZ             |
      | Imagen         | cover-image.jpg           |
      | Progress bar   | 15/50 boletos generados   |
      | Cortesía de    | Juan RP                   |

  Scenario: RP desactivado
    Given un RP está inactivo
    When accedo a su link
    Then veo mensaje "Este código de RP no está activo"
    And el formulario está deshabilitado

  Scenario: Límite alcanzado
    Given un RP tiene 50/50 tickets
    When accedo a su link
    Then veo mensaje "Este RP ha alcanzado su límite"
    And el formulario está deshabilitado
```

**Story Points:** 5  
**Prioridad:** Alta  
**Dependencies:** HU-001  
**Sprint:** Sprint 2

---

### HU-010: Reclamar Ticket (Formulario Público)

**Como** invitado  
**Quiero** ingresar mis datos y descargar mi boleto  
**Para** asistir al evento

#### Criterios de Aceptación

```gherkin
Feature: Reclamar ticket

  Scenario: Generación exitosa
    Given estoy en el landing público
    When ingreso:
      | Campo    | Valor              |
      | Nombre   | Juan Pérez         |
      | Email    | juan@example.com   |
      | Teléfono | +52 123 456 7890   |
    And hago click en "Generar Mi Boleto"
    Then se crea un ticket con status VALID
    And se descarga automáticamente el PDF
    And veo pantalla de confirmación
    And recibo email con copia del PDF

  Scenario: Email duplicado
    Given ya generé un ticket con "juan@example.com"
    When intento generar otro con el mismo email
    Then veo error "Ya existe un boleto con este email"
    And puedo usar otro email

  Scenario: CAPTCHA inválido
    Given el sistema tiene CAPTCHA habilitado
    When no resuelvo el CAPTCHA
    Then el botón "Generar" está deshabilitado
```

#### Tareas Técnicas

- [ ] Endpoint POST `/api/rp/public/{code}/claim`
- [ ] Validación de email único por RP
- [ ] Integración CAPTCHA (Google reCAPTCHA)
- [ ] PDF Generator con branding
- [ ] Email service con template
- [ ] UI: Form validation
- [ ] UI: Success screen con preview QR

**Story Points:** 8  
**Prioridad:** Alta  
**Dependencies:** HU-009  
**Sprint:** Sprint 3

---

## Epic 5: Analytics y Dashboard

### HU-011: Ver Estadísticas de RP (Dashboard)

**Como** RP  
**Quiero** ver mis estadísticas en tiempo real  
**Para** saber cuántos invitados confirmados tengo

#### Criterios de Aceptación

```gherkin
Feature: Dashboard RP

  Scenario: Ver stats generales
    Given he generado 20 tickets
    And 15 han sido usados
    When accedo a mi dashboard
    Then veo:
      | Métrica       | Valor   |
      | Generados     | 20/50   |
      | Usados        | 15      |
      | Válidos       | 5       |
      | Conversión    | 75%     |

  Scenario: Ver breakdown por tipo
    Given tengo tickets:
      | Tipo       | Generados | Usados |
      | VIP        | 10        | 8      |
      | Influencer | 5         | 4      |
      | Prensa     | 5         | 3      |
    Then veo 3 cards con stats por tipo
    And cada card tiene el color del tipo
```

#### Tareas Técnicas

- [ ] Endpoint GET `/api/rp/tickets/my-stats`
- [ ] Service: agregaciones por tipo
- [ ] UI: Stats cards con Chart.js
- [ ] UI: Progress bar animada
- [ ] Auto-refresh cada 30 segundos

**Story Points:** 5  
**Prioridad:** Media  
**Dependencies:** HU-006, HU-007  
**Sprint:** Sprint 3

---

### HU-012: Listar Mis Tickets

**Como** RP  
**Quiero** ver lista de todos mis tickets generados  
**Para** hacer seguimiento individual

#### Criterios de Aceptación

```gherkin
Feature: Listar tickets

  Scenario: Ver todos los tickets
    Given he generado 20 tickets
    When accedo a la pestaña "Mis Tickets"
    Then veo tabla con:
      | QR Code    | Tipo       | Nickname    | Estado | Fecha      |
      | RP-abc123  | VIP        | El Padrino  | USADO  | 2025-12-31 |
      | RP-def456  | Influencer | -           | VÁLIDO | 2025-12-30 |
    And los tickets están ordenados por fecha desc

  Scenario: Filtrar por estado
    When selecciono filtro "USADO"
    Then solo veo tickets con status USED

  Scenario: Filtrar por tipo
    When selecciono filtro tipo "VIP"
    Then solo veo tickets de tipo VIP
```

**Story Points:** 5  
**Prioridad:** Baja  
**Dependencies:** HU-011  
**Sprint:** Sprint 4

---

### HU-013: Dashboard Organizador (Todos los RPs)

**Como** organizador  
**Quiero** ver estadísticas consolidadas de todos mis RPs  
**Para** evaluar su desempeño

#### Criterios de Aceptación

```gherkin
Feature: Dashboard organizador

  Scenario: Ver ranking de RPs
    Given tengo 5 RPs
    When accedo a "Dashboard RPs"
    Then veo tabla:
      | RP          | Generados | Usados | Conversión |
      | Juan RP     | 50        | 45     | 90%        |
      | María RP    | 40        | 30     | 75%        |
      | Pedro RP    | 30        | 20     | 67%        |
    And están ordenados por conversión desc

  Scenario: Ver stats globales
    Then veo cards:
      | Total RPs activos      | 5   |
      | Total tickets generados| 120 |
      | Total tickets usados   | 95  |
      | Conversión promedio    | 79% |
```

**Story Points:** 8  
**Prioridad:** Media  
**Dependencies:** HU-011  
**Sprint:** Sprint 4

---

## Epic 6: Scanner Enhanced

### HU-014: Escanear Ticket RP

**Como** staff en puerta  
**Quiero** escanear tickets de RP y ver el tipo de invitado  
**Para** brindar mejor servicio según categoría

#### Criterios de Aceptación

```gherkin
Feature: Escaneo RP

  Scenario: Escanear ticket VIP válido
    Given un ticket RP tiene:
      | QR Code     | RP-abc123  |
      | Tipo        | VIP        |
      | Nickname    | El Padrino |
      | RP          | Juan RP    |
      | Status      | VALID      |
    When escaneo el QR
    Then veo pantalla verde con:
      """
      🟢 VÁLIDO
      Tipo: 👑 VIP
      Nickname: "El Padrino"
      Cortesía de: Juan RP
      """
    And el ticket cambia a status USED
    And se incrementa rpProfile.ticketsUsed

  Scenario: Ticket ya usado
    Given un ticket tiene status USED
    When escaneo el QR
    Then veo pantalla roja:
      """
      🔴 YA USADO
      Escaneado: 2025-12-31 22:15
      """
```

#### Tareas Técnicas

- [ ] Actualizar endpoint `/scan/validate` para incluir joins
- [ ] Response incluye: `guestType`, `guestNickname`, `rpProfile.user.name`
- [ ] UI Scanner: Mostrar tipo con color de badge
- [ ] UI Scanner: Animated background según estado

**Story Points:** 5  
**Prioridad:** Alta  
**Dependencies:** HU-007  
**Sprint:** Sprint 3

---

## 📊 Resumen por Sprint

### Sprint 1 (Semanas 1-2)
**Objetivo:** Foundation - Gestión de RPs y Tipos

| ID | Historia | Points | Priority |
|----|----------|--------|----------|
| HU-001 | Crear Usuario RP | 5 | Alta |
| HU-002 | Desactivar RP | 3 | Media |
| HU-004 | Crear Tipo de Invitado | 5 | Alta |
| HU-006 | Login de RP | 5 | Alta |

**Total:** 18 story points

---

### Sprint 2 (Semanas 3-4)
**Objetivo:** Generación de Tickets y Landing Pública

| ID | Historia | Points | Priority |
|----|----------|--------|----------|
| HU-003 | Editar Límite de Tickets | 3 | Media |
| HU-007 | Generar Ticket Individual | 8 | Alta |
| HU-008 | Generar Tickets en Lote | 5 | Media |
| HU-009 | Ver Info del Evento (Landing) | 5 | Alta |

**Total:** 21 story points

---

### Sprint 3 (Semanas 5-6)
**Objetivo:** Completar Flujo Público y Analytics

| ID | Historia | Points | Priority |
|----|----------|--------|----------|
| HU-010 | Reclamar Ticket (Formulario) | 8 | Alta |
| HU-011 | Ver Estadísticas de RP | 5 | Media |
| HU-014 | Escanear Ticket RP | 5 | Alta |

**Total:** 18 story points

---

### Sprint 4 (Semanas 7-8)
**Objetivo:** Polish y Features Avanzados

| ID | Historia | Points | Priority |
|----|----------|--------|----------|
| HU-005 | Ordenar Tipos de Invitado | 3 | Baja |
| HU-012 | Listar Mis Tickets | 5 | Baja |
| HU-013 | Dashboard Organizador | 8 | Media |

**Total:** 16 story points

---

## 📈 Velocity Estimado

| Sprint | Story Points | Objetivo |
|--------|--------------|----------|
| Sprint 1 | 18 | Foundation completa |
| Sprint 2 | 21 | Generación funcional |
| Sprint 3 | 18 | MVP V2 completo |
| Sprint 4 | 16 | Polish y extras |

**Velocity promedio:** 18.25 points/sprint  
**Duración total:** 8 semanas  
**Total points:** 73

---

## 🎯 Definition of Ready (DoR)

Una historia está lista para desarrollo cuando:

- [ ] Título claro y conciso
- [ ] Criterios de aceptación definidos en Gherkin
- [ ] Story points estimados por el equipo
- [ ] Dependencies identificadas
- [ ] UI mockups adjuntos (si aplica)
- [ ] API contracts definidos
- [ ] Revisión por Product Owner

---

## ✅ Definition of Done (DoD)

Una historia está completada cuando:

- [ ] Código desarrollado y code reviewed
- [ ] Tests unitarios pasando (\> 80% coverage)
- [ ] Tests E2E del happy path pasando
- [ ] Documentación API actualizada (Swagger)
- [ ] UI responsive (mobile + desktop)
- [ ] Sin errores de lint/TypeScript
- [ ] Merged a `main` branch
- [ ] Deployed a staging
- [ ] Demo al PO aprobado

---

**Última Actualización:** 2025-12-17  
**Formato:** Agile User Stories (Scrum)  
**Equipo:** MonoMarket Development Team
