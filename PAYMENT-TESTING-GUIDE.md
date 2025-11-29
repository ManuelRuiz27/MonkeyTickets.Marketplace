# 💳 Guía de Pruebas de Pasarelas de Pago

**Plataforma:** MonoMarket Tickets  
**Fecha:** Noviembre 2024

---

## 🎯 Pasarelas Configuradas

El sistema soporta:
1. **OpenPay** - Tarjetas, SPEI, OXXO
2. **MercadoPago** - Google Pay, Apple Pay (limitado)

---

## 🔑 OpenPay - Modo Sandbox

### Configuración

Agregar en `.env`:
```bash
OPENPAY_MERCHANT_ID=tu_merchant_id_sandbox
OPENPAY_PRIVATE_KEY=sk_sandbox_xxxxx
OPENPAY_PUBLIC_KEY=pk_sandbox_xxxxx
OPENPAY_PRODUCTION=false
```

### 💳 Tarjetas de Prueba

#### ✅ Tarjetas Exitosas

**Visa:**
```
Número: 4111 1111 1111 1111
CVV: 123
Fecha: cualquier fecha futura (ej: 12/25)
Nombre: CUALQUIER NOMBRE
```

**MasterCard:**
```
Número: 5555 5555 5555 4444
CVV: 123
Fecha: 12/25
Nombre: CUALQUIER NOMBRE
```

**American Express:**
```
Número: 3782 822463 10005
CVV: 1234 (4 dígitos)
Fecha: 12/25
Nombre: CUALQUIER NOMBRE
```

#### ❌ Tarjetas con Errores (para probar manejo de errores)

**Fondos Insuficientes:**
```
Número: 4000 0000 0000 0101
CVV: 123
Fecha: 12/25
```

**Tarjeta Rechazada:**
```
Número: 4000 0000 0000 0002
CVV: 123
Fecha: 12/25
```

**CVV Inválido:**
```
Número: 4000 0000 0000 0127
CVV: 123
Fecha: 12/25
```

**Tarjeta Expirada:**
```
Número: 4000 0000 0000 0069
CVV: 123
Fecha: 12/25
```

### 🏧 SPEI (Transferencia bancaria)

Para probar SPEI en sandbox:
1. El sistema genera una **CLABE interbancaria**
2. No se puede hacer transferencia real en sandbox
3. Puedes **simular el webhook** manualmente:

```bash
curl -X POST http://localhost:3000/api/webhooks/openpay \
  -H "Content-Type: application/json" \
  -d '{
    "type": "charge.succeeded",
    "event_date": "2024-11-27T10:00:00-06:00",
    "transaction": {
      "id": "test_spei_123",
      "amount": 500.00,
      "status": "completed",
      "payment_method": {
        "type": "bank_account"
      }
    }
  }'
```

### 🏪 OXXO

Para OXXO en sandbox:
1. El sistema genera **referencia de pago**
2. No se puede pagar realmente en OXXO en modo sandbox
3. Simular webhook de pago completado:

```bash
curl -X POST http://localhost:3000/api/webhooks/openpay \
  -H "Content-Type: application/json" \
  -d '{
    "type": "charge.succeeded",
    "event_date": "2024-11-27T10:00:00-06:00",
    "transaction": {
      "id": "test_oxxo_456",
      "amount": 500.00,
      "status": "completed",
      "payment_method": {
        "type": "store",
        "reference": "99999999999999"
      }
    }
  }'
```

---

## 💰 MercadoPago - Modo Sandbox

### Configuración

```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx
MP_ACCESS_TOKEN=TEST-xxxxx
MP_PUBLIC_KEY=TEST-xxxxx
```

### 💳 Tarjetas de Prueba MercadoPago

#### ✅ Aprobada

**MasterCard:**
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha: 11/25
Nombre: APRO
Email: test@test.com
```

**Visa:**
```
Número: 4170 0688 1010 8020
CVV: 123
Fecha: 11/25
Nombre: APRO
Email: test@test.com
```

#### ❌ Rechazada

**Tarjeta Rechazada:**
```
Número: 5031 4332 1540 6351
CVV: 123
Fecha: 11/25
Nombre: OTRE
```

**Fondos Insuficientes:**
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha: 11/25
Nombre: FUND
```

---

## 🧪 Flujo de Prueba Completo

### Paso 1: Preparar Ambiente

```bash
# Verificar que los servicios estén corriendo
docker ps

# Deberías ver:
# - monomarket-api-dev
# - monomarket-web-dev
# - monomarket-postgres-dev
```

### Paso 2: Ir al Checkout

1. Abrir: `http://localhost:5173`
2. Seleccionar un evento
3. Agregar tickets al carrito
4. Ir a checkout

### Paso 3: Completar Información

**Datos del comprador:**
```
Nombre: Juan Pérez
Email: test@example.com
Teléfono: 5512345678
```

### Paso 4: Seleccionar Método de Pago

#### Opción A: Tarjeta de Crédito (OpenPay)

1. Seleccionar "Tarjeta de Crédito/Débito"
2. Ingresar tarjeta de prueba:
   ```
   4111 1111 1111 1111
   CVV: 123
   Exp: 12/25
   Titular: JUAN PEREZ
   ```
3. Click "Pagar"
4. **Resultado esperado:** 
   - ✅ Pago aprobado inmediatamente
   - Redirect a página de éxito
   - Order status = PAID
   - Tickets generados

#### Opción B: SPEI

1. Seleccionar "Transferencia SPEI"
2. Click "Generar Referencia"
3. **Resultado esperado:**
   - CLABE generada
   - Instrucciones de transferencia
   - Order status = PENDING
4. **Simular pago:** Usar curl del webhook arriba
5. **Después del webhook:**
   - Order status = PAID
   - Tickets generados y enviados por email

#### Opción C: OXXO

1. Seleccionar "OXXO"
2. Click "Generar Referencia"
3. **Resultado esperado:**
   - Referencia de 14 dígitos
   - Código de barras
   - Order status = PENDING
4. **Simular pago:** Usar curl del webhook
5. **Verificar:** Order actualizado a PAID

---

## 🔍 Verificar Resultados

### Verificar en Base de Datos

```sql
-- Ver órdenes
SELECT id, status, total, "createdAt" 
FROM "Order" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Ver pagos
SELECT 
  id, 
  gateway, 
  status, 
  amount, 
  "gatewayTransactionId"
FROM "Payment" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Ver tickets generados
SELECT 
  id, 
  "qrCode", 
  status, 
  "orderId"
FROM "Ticket" 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### Verificar en Logs

```bash
# Ver logs del API
docker logs monomarket-api-dev --tail 50 -f

# Buscar:
# - "Payment created"
# - "Order status updated"
# - "Tickets generated"
```

---

## ⚠️ Problemas Comunes

### 1. "Payment gateway error"

**Causa:** Credenciales no configuradas o inválidas

**Solución:**
```bash
# Verificar .env
cat apps/api/.env | grep OPENPAY
cat apps/api/.env | grep MERCADOPAGO
```

### 2. "Webhook not received"

**Causa:** URL de webhook no accesible desde OpenPay

**Solución en desarrollo:**
- Usar ngrok o similar para tunnel
- O simular webhooks manualmente con curl

### 3. "Order stuck in PENDING"

**Causa:** Webhook no procesado

**Solución:**
```bash
# Simular webhook manualmente (ver ejemplos arriba)
curl -X POST http://localhost:3000/api/webhooks/openpay ...
```

---

## 📊 Tarjetas por Escenario

### Flujo Exitoso (Happy Path)
```
Tarjeta: 4111 1111 1111 1111
Esperado: ✅ Pago aprobado, tickets generados
```

### Fondos Insuficientes
```
Tarjeta: 4000 0000 0000 0101
Esperado: ❌ Error "Insufficient funds"
```

### Tarjeta Inválida
```
Tarjeta: 4242 4242 4242 4241 (número incorrecto)
Esperado: ❌ Error "Invalid card number"
```

### CVV Incorrecto
```
Tarjeta: 4000 0000 0000 0127
CVV: 999
Esperado: ❌ Error "Invalid CVV"
```

---

## 🎭 Escenarios de Prueba Recomendados

### Test 1: Compra Exitosa con Tarjeta
1. Seleccionar evento
2. Agregar 2 tickets
3. Pagar con 4111 1111 1111 1111
4. ✅ Verificar redirect a success page
5. ✅ Verificar tickets en DB
6. ✅ Verificar email enviado (logs)

### Test 2: Pago Rechazado
1. Seleccionar evento
2. Agregar tickets
3. Pagar con 4000 0000 0000 0002
4. ❌ Verificar mensaje de error
5. ✅ Order status = FAILED
6. ✅ No hay tickets generados

### Test 3: SPEI
1. Seleccionar método SPEI
2. Generar referencia
3. Verificar CLABE mostrada
4. Simular webhook de pago
5. ✅ Order actualizado a PAID
6. ✅ Tickets generados

### Test 4: OXXO
1. Seleccionar método OXXO
2. Generar referencia
3. Verificar código de barras
4. Simular webhook
5. ✅ Verificar actualización

---

## 📝 Checklist de Pruebas

### Pagos
- [ ] Pago con tarjeta exitoso (Visa)
- [ ] Pago con tarjeta exitoso (Mastercard)
- [ ] Pago rechazado por fondos
- [ ] Pago rechazado por tarjeta inválida
- [ ] SPEI generación de referencia
- [ ] SPEI webhook de confirmación
- [ ] OXXO generación de código
- [ ] OXXO webhook de confirmación

### Órdenes
- [ ] Order creada con status PENDING
- [ ] Order actualizada a PAID
- [ ] Order con múltiples tickets
- [ ] Cálculo correcto de comisiones

### Tickets
- [ ] Tickets generados automáticamente
- [ ] QR codes únicos
- [ ] PDF generado correctamente
- [ ] Email con tickets enviado

---

## 🔗 Enlaces Útiles

**Documentación OpenPay:**
- Sandbox: https://sandbox.openpay.mx/
- Tarjetas de prueba: https://www.openpay.mx/docs/testing.html

**Documentación MercadoPago:**
- Testing: https://www.mercadopago.com.mx/developers/es/docs/checkout-api/testing

---

**Última actualización:** Nov 27, 2024  
**Estado:** Listo para pruebas en sandbox
