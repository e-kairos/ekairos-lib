# Ekairos Next.js Workbench

Workbench completo para probar `ekairos` con Workflow DevKit y Local World.

## Características

- ✅ Next.js App Router
- ✅ Workflow DevKit integration
- ✅ Local World para testing
- ✅ Story Engine con actions no serializables
- ✅ Workflow Runner con `"use workflow"` directive

## Setup

```bash
cd workbench/nextjs
pnpm install
```

## Cómo probar

### Test Standalone (sin servidor)

```bash
cd ../..
pnpm build
cd workbench/nextjs
pnpm test
```

Este test (`test-workflow.ts`):
1. Configura un Local World vía variables de entorno
2. Importa y registra una story
3. Importa la función workflow (sin transformar)
4. Verifica su estructura y metadata
5. Valida que `storyRunner` está disponible desde `ekairos`

> ℹ️ Nota: El SWC plugin que añade `workflowId` solo corre durante el build de Next.js. Por eso el test standalone no ejecuta `start()`, pero sí valida toda la cadena de integración.

### Test de Integración (servidor + endpoint)

```bash
cd ../..
pnpm build
cd workbench/nextjs
pnpm run test:integration
```

Este test (`test-integration.ts`) ejecuta un ciclo end-to-end:
1. Reconstruye todo el monorepo para asegurar dependencias frescas.
2. Levanta `pnpm dev` en segundo plano (puerto `3030` por defecto, configurable con `TEST_WORKBENCH_PORT`).
3. Espera a que el endpoint `/api/test` responda OK.
4. Envía una petición `POST` con contexto de prueba.
5. Verifica que la respuesta del workflow tenga `success: true` y que el payload incluya `result.success`.
6. Finaliza el servidor y limpia `.workflow-data-integration/`.

Si cualquier paso falla, el script aborta con error y vuelca la salida capturada del dev server para facilitar el diagnóstico.

### Test con Next.js Dev Server (flujo completo)

```bash
# Terminal 1: preparar y levantar el servidor
cd ../..
pnpm build
cd workbench/nextjs
pnpm dev

# Terminal 2: disparar el workflow
curl -X POST http://localhost:3000/api/test \\
  -H "Content-Type: application/json" \\
  -d '{"context": {"test": true}}'
```

Este flujo sí pasa por la transformación del plugin y ejecuta el workflow real end-to-end usando Local World.

> 💡 Puedes dejar `pnpm dev` corriendo y repetir la llamada `curl` cuantas veces necesites; cada ejecución queda registrada en `.workflow-data/`.

### Playwright E2E

```bash
pnpm install
pnpm build
cd workbench/nextjs
pnpm test:e2e
```

- Levanta automáticamente `pnpm dev:test` (puerto `3030`).
- Ejecuta los specs Playwright en `playwright/`.
- Valida que la página raíz renderice correctamente.
- Hace una llamada `POST /api/test` y comprueba `{ success: true }`.

Modo interactivo:

```bash
pnpm test:e2e:ui
```

## Estructura

```
workbench/nextjs/
├── app/
│   ├── workflows/
│   │   └── test-story.ts      # Workflow con "use workflow"
│   ├── api/
│   │   └── test/
│   │       └── route.ts       # Endpoint para disparar workflow
│   ├── page.tsx               # Landing page
│   └── layout.tsx             # Root layout
├── stories.ts                  # Registro de stories
├── test-workflow.ts            # Test standalone (tsx)
├── next.config.ts              # Config con withWorkflow
├── package.json
└── tsconfig.json
```

## Qué se valida

1. **Story Registration**: Engine global con actions no serializables
2. **Workflow Structure**: Función con directiva `"use workflow"`
3. **Local World**: Configuración vía env vars / runtime
4. **Story Runner**: Disponibilidad desde el paquete `ekairos`
5. **Non-serializable Actions**: Ejecutores preservados en el registry
6. **(Server)** Flujo completo a través del endpoint `/api/test`

## Datos de Workflow

Los datos se almacenan en `.workflow-data-test/` (para test) o `.workflow-data/` (para dev server).

Ver runs:
```bash
npx workflow inspect runs
npx workflow inspect runs --web
```

## Notas

- El loader de Next.js (`workflow/next`) transpila `ekairos` durante el build
- Las directivas `"use workflow"` y `"use step"` son procesadas por el SWC plugin
- El Local World no requiere configuración adicional
- El test standalone permite validar integración sin levantar servidor

## Troubleshooting

Si el test falla:

1. **Build los paquetes primero:**
   ```bash
   cd ../..
   pnpm build
   ```

2. **Reinstalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Verificar que workflow está instalado:**
   ```bash
   pnpm list workflow
   ```

4. **Limpiar workflow data:**
   ```bash
   rm -rf .workflow-data-test .workflow-data
   ```

