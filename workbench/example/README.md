# Pulzar Workbench Example

Este workbench demuestra el uso de `@ekairos/story` con el motor de historias.

## Estructura

```
workbench/example/
├── src/
│   └── index.ts         # Ejemplo de registro y uso de story
├── package.json
├── tsconfig.json
└── README.md
```

## Uso

```bash
# Desde la raíz del monorepo
pnpm install
pnpm --filter @ekairos/example-workbench dev

# O desde este directorio
pnpm dev
```

## Características demostradas

1. **Registro de Story**: Cómo registrar una historia con acciones no serializables
2. **Engine Global**: Uso del `engine.register()` para almacenar historias en memoria
3. **Descriptor Serializable**: Generación de descriptores serializables para workflows
4. **Actions con `execute`**: Definición de acciones que ejecutan código no serializable
5. **Callbacks**: Hooks del ciclo de vida (`evaluateToolCalls`, `onEnd`)

## Ejemplo de integración con Workflows/Next.js

```typescript
// stories.ts - Registro central de historias
import { story, engine } from '@ekairos/story';

const myStory = {
  key: 'platform:my-story',
  narrative: 'Asistente que...',
  actions: [
    {
      name: 'doSomething',
      description: 'Hace algo',
      implementationKey: 'platform.doSomething',
      execute: async ({ arg, contextId }) => {
        // Código no serializable
        return { success: true };
      }
    }
  ]
};

export const storyEngine = engine.register(myStory);
export const descriptor = storyEngine.story('platform:my-story');

// app/workflows/my-story.ts - Workflow exportado
import { storyRunner } from '@ekairos/story';
import { descriptor } from '@/stories';

export async function myStoryWorkflow(args?: { context?: any }) {
  "use workflow";  // Directiva para el loader de Next.js
  return storyRunner(descriptor, args);
}

// route.ts - Disparar el workflow
import { start } from 'workflow/api';
import { myStoryWorkflow } from '@/app/workflows/my-story';

export async function POST() {
  await start(myStoryWorkflow, [{ context: null }]);
  return new Response('OK');
}
```

## Próximos pasos

- Agregar más ejemplos de historias complejas
- Demostrar integración con @ekairos/dataset
- Ejemplos de testing de historias

