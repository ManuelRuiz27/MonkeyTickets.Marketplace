# Guía de pruebas de API con Postman

Esta guía te ayuda a:
- Probar la API de MonoMarket con Postman (local y Render).
- Ver rápidamente si la base de datos en Render tiene cargados los datos semilla.

---

## 1. Entornos en Postman

Crea dos entornos en Postman:

### Entorno: `MonoMarket - Local`
- `base_url` = `http://localhost:3000/api`
- `auth_token` = *(vacío al inicio, lo llenas después del login)*

### Entorno: `MonoMarket - Render`
- `base_url` = `https://monomarket-api.onrender.com/api`  
  > Si tu servicio en Render tiene otro dominio, usa la **URL externa** del servicio y agrégale `/api`.  
  > Ejemplo: `https://tu-servicio.onrender.com/api`
- `auth_token` = *(vacío al inicio)*

En cada request de Postman utilizarás:
- `{{base_url}}` para la URL base.
- `{{auth_token}}` para el header `Authorization`.

---

## 2. Importar la colección desde OpenAPI

La API ya tiene un contrato OpenAPI que Postman puede importar:

Ruta del archivo en el repo:
- `packages/contracts/openapi/monomarket-tickets.yaml`

Pasos en Postman:
1. Abrir Postman.
2. Click en **Import**.
3. Pestaña **File**.
4. Arrastra el archivo `monomarket-tickets.yaml` o selecciónalo desde esa ruta.
5. Postman creará automáticamente una **colección** con todos los endpoints.
6. Asigna el entorno `MonoMarket - Local` o `MonoMarket - Render` según qué quieras probar.

---

## 3. Smoke test básico (sin autenticación)

### 3.1 Health check
- Método: `GET`
- URL: `{{base_url}}/health`

Respuesta esperada (200):
- `status`: `"ok"`
- `database`: `"ok"`

Si esto falla en Render:
- Revisa que tu servicio `monomarket-api` esté desplegado y sano.
- Revisa que la variable `DATABASE_URL` esté configurada en Render.

### 3.2 Listar eventos públicos
- Método: `GET`
- URL: `{{base_url}}/public/events`

Respuesta esperada (200):
- Un JSON con una lista de eventos.  
  En desarrollo con seeds cargados deberías ver, entre otros:
  - `"Concierto Rock en Vivo - The Legends"`
  - `"Festival de Jazz 2024"`

---

## 4. Login y uso de token (rutas protegidas)

### 4.1 Login como Director (usando datos semilla)

- Método: `POST`
- URL: `{{base_url}}/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):

```json
{
  "email": "director@monomarket.com",
  "password": "password123"
}
```

Respuesta esperada (200):
- Un objeto con:
  - `user`: datos del usuario (sin password).
  - `token`: JWT para usar en siguientes requests.

En Postman:
1. Copia el valor de `token` de la respuesta.
2. Ve al entorno actual (`MonoMarket - Local` o `MonoMarket - Render`).
3. Edita la variable `auth_token` y pega el token ahí.

### 4.2 Rutas de organizador protegidas

Ejemplo: listar eventos del organizador:

- Método: `GET`
- URL: `{{base_url}}/organizer/events`
- Headers:
  - `Authorization: Bearer {{auth_token}}`

Respuesta esperada:
- Lista de eventos asociados al usuario autenticado.

Si obtienes `401 Unauthorized`:
- Verifica que `auth_token` esté bien copiado.
- Verifica que el token no haya expirado.

---

## 5. Verificar si la base de datos en Render tiene datos semilla

Tienes dos formas sencillas de comprobarlo: vía API (Postman) o directamente en la base de datos.

### 5.1 Verificar seeds vía API (Postman)

Usa el entorno `MonoMarket - Render` en Postman.

#### 5.1.1 Probar login con usuario semilla

- Request: `POST {{base_url}}/auth/login`
- Body:

```json
{
  "email": "director@monomarket.com",
  "password": "password123"
}
```

Interpretación:
- Si la respuesta es **200** y recibes un `token` → **la tabla `users` de Render tiene al menos el usuario director seed**.
- Si la respuesta es **401 Invalid credentials** → probablemente **no se ha corrido el seed** en esa base de datos.

#### 5.1.2 Probar eventos públicos

- Request: `GET {{base_url}}/public/events`

Interpretación:
- Si ves eventos como:
  - `"Concierto Rock en Vivo - The Legends"`
  - `"Festival de Jazz 2024"`
  - `"Evento Privado VIP - Cena de Gala"` (vía `/public/events/unlisted/vip-gala-2024-exclusive`)
  → entonces **los seeds de eventos/organizers también están cargados en Render**.
- Si la lista viene vacía (`[]` o `data: []`) → lo más probable es que **no haya seeds cargados** en la base de datos de Render.

> Tip: Puedes agregar tests en Postman para validar automáticamente, por ejemplo:
> ```js
> pm.test("Hay al menos 1 evento", function () {
>   const body = pm.response.json();
>   pm.expect(body.data.length).to.be.above(0);
> });
> ```

### 5.2 Verificar seeds directamente en la base de datos de Render

Desde el panel de Render:
1. Entra a tu base de datos `monomarket-db`.
2. Usa el botón **Connect** o **psql console** (según lo que Render muestre).
3. Ejecuta consultas simples, por ejemplo:

```sql
SELECT COUNT(*) FROM "users";
SELECT COUNT(*) FROM "events";
SELECT COUNT(*) FROM "orders";
```

Interpretación rápida:
- Si `users` ≥ 4 y `events` ≥ 3 → coincide con la descripción de seeds del proyecto.
- Si los conteos son 0 o muy bajos → probablemente la DB de Render está vacía o sin seeds completos.

---

## 6. Cómo correr los seeds apuntando a Render (opcional)

Si confirmas que tu base de datos de Render está vacía y quieres cargar los seeds:

1. En Render, copia la cadena de conexión de `monomarket-db` (connection string).
2. En tu máquina local, en `apps/api/.env`, coloca esa cadena en `DATABASE_URL` (o crea un archivo `.env.render` y exporta esa URL antes de correr comandos).
3. Desde `apps/api`, ejecuta:

```bash
cd apps/api

# Aplicar migraciones al esquema actual de Render
npx prisma migrate deploy

# Cargar seeds
npx prisma db seed
```

Después de esto, vuelve a probar con Postman contra Render:
- `POST {{base_url}}/auth/login` (usuario director).
- `GET {{base_url}}/public/events`.

Si ambas llamadas regresan datos coherentes, tu base de datos en Render ya tiene los datos semilla cargados correctamente.

