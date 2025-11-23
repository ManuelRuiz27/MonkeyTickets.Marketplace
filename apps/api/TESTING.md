# 🧪 Guía de Testing - MonoMarket Tickets API

## Configuración de Tests

### Tipos de Tests

1. **Tests Unitarios**: Prueban componentes individuales (servicios, controladores)
2. **Tests de Integración (E2E)**: Prueban flujos completos con la base de datos

### Instalar Dependencias

```powershell
cd apps/api
pnpm install
```

## 📋 Ejecutar Tests

### Tests Unitarios

```powershell
# Ejecutar todos los tests unitarios
pnpm run test

# Ejecutar tests en modo watch (útil durante desarrollo)
pnpm run test:watch

# Ejecutar tests con cobertura
pnpm run test:cov
```

### Tests E2E (End-to-End)

```powershell
# Asegúrate de tener la base de datos corriendo
pnpm run docker:dev  # o configura PostgreSQL localmente

# Ejecutar seeds para tener datos de prueba
pnpm run prisma:seed

# Ejecutar tests E2E
pnpm run test:e2e
```

## 📊 Cobertura de Tests

### Tests Creados

#### ✅ AuthService (`auth.service.spec.ts`)
- ✅ Registro de nuevos usuarios
- ✅ Login con credenciales válidas
- ✅ Manejo de errores de autenticación
- ✅ Validación de usuarios
- ✅ Generación de JWT tokens

#### ✅ EventsService (`events.service.spec.ts`)
- ✅ Obtener eventos públicos
- ✅ Obtener evento por ID
- ✅ Filtrado por status PUBLISHED
- ✅ Manejo de eventos inexistentes

#### ✅ Auth E2E (`auth.e2e-spec.ts`)
- ✅ POST /api/auth/register
- ✅ POST /api/auth/login
- ✅ Validación de datos de entrada
- ✅ Manejo de errores 400/401

#### ✅ Events E2E (`events.e2e-spec.ts`)
- ✅ GET /api/public/events
- ✅ GET /api/public/events/:id
- ✅ Validación de respuestas
- ✅ Manejo de errores 404

## 🎯 Casos de Prueba

### Autenticación

```typescript
describe('Auth Flow', () => {
  it('Registro exitoso de organizador')
  it('Login con credenciales válidas')
  it('Rechazo de email inválido')
  it('Rechazo de contraseña corta')
  it('Error 401 con credenciales incorrectas')
});
```

### Eventos

```typescript
describe('Events Flow', () => {
  it('Listar eventos públicos')
  it('Obtener detalle de evento')
  it('Solo mostrar eventos PUBLISHED')
  it('Error 404 para evento inexistente')
});
```

## 🔧 Configuración de Jest

El archivo `jest.config.js` está configurado con:

- ✅ Soporte para TypeScript
- ✅ Mapeo de módulos del monorepo
- ✅ Cobertura de código
- ✅ Exclusión de archivos innecesarios

## 📝 Escribir Nuevos Tests

### Ejemplo: Test Unitario

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MiServicio } from './mi-servicio.service';

describe('MiServicio', () => {
  let service: MiServicio;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MiServicio],
    }).compile();

    service = module.get<MiServicio>(MiServicio);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe ejecutar mi funcionalidad', () => {
    const result = service.miFuncion();
    expect(result).toBe('esperado');
  });
});
```

### Ejemplo: Test E2E

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('MiEndpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup de la app
  });

  it('/api/mi-endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/mi-endpoint')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
      });
  });
});
```

## 🐛 Testing con Base de Datos

### Opción 1: Base de Datos de Memoria (SQLite)

Para tests rápidos, puedes usar SQLite en memoria:

```typescript
// test/setup-db.ts
export const setupTestDB = () => {
  process.env.DATABASE_URL = 'file:./test.db';
};
```

### Opción 2: PostgreSQL de Test

Usa una base de datos separada para tests:

```env
DATABASE_URL="postgresql://monomarket:password@localhost:5432/monomarket_test"
```

### Limpiar Base de Datos entre Tests

```typescript
afterEach(async () => {
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.event.deleteMany();
  // ... más limpiezas
});
```

## 📊 Interpretar Resultados

### Cobertura de Código

Después de ejecutar `pnpm run test:cov`, verás:

```
-----------------|---------|----------|---------|---------|
File             | % Stmts | % Branch | % Funcs | % Lines |
-----------------|---------|----------|---------|---------|
All files        |   85.5  |   72.3   |   90.1  |   84.8  |
 auth/           |   92.1  |   85.4   |   100   |   91.5  |
 events/         |   88.3  |   75.2   |   85.7  |   87.9  |
-----------------|---------|----------|---------|---------|
```

**Meta recomendada**: >80% de cobertura

### Resultados de Tests

```
PASS  src/modules/auth/auth.service.spec.ts
  AuthService
    ✓ debe registrar un nuevo organizador (125 ms)
    ✓ debe hacer login exitosamente (98 ms)
    ✓ debe lanzar error con credenciales inválidas (45 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        2.534 s
```

## 🚀 Integración Continua (CI)

### GitHub Actions (ejemplo)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run test
      - run: pnpm run test:e2e
```

## 🎯 Mejores Prácticas

1. ✅ **Aislamiento**: Cada test debe ser independiente
2. ✅ **Nombrado Claro**: Describe qué hace el test
3. ✅ **Arrange-Act-Assert**: Organiza tus tests
4. ✅ **Mock Externo**: Mockea dependencias externas
5. ✅ **Limpieza**: Limpia datos después de cada test
6. ✅ **Cobertura**: Apunta a >80% de cobertura
7. ✅ **Fast Tests**: Tests unitarios deben ser rápidos (<100ms)

## 🔍 Debugging Tests

### Ejecutar un test específico

```powershell
# Por archivo
pnpm run test auth.service.spec.ts

# Por nombre de test
pnpm run test -t "debe registrar un nuevo organizador"
```

### Ver output detallado

```powershell
pnpm run test --verbose
```

### Debugging en VS Code

Agregar a `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## 📚 Recursos

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)

---

**Nota**: Asegúrate de ejecutar los seeds antes de los tests E2E para tener datos consistentes.
