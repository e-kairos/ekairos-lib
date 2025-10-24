# Pulzar Lib Core - Monorepo

Monorepo de librerías para el sistema de agentes y stories de Pulzar/Ekairos.

## 📦 Paquetes

### `ekairos` (Paquete Principal)
**El paquete core** que incluye:
- 🤖 **Agent/Story**: Sistema de agentes durables con IA
- 🎭 **Story Engine**: Sistema de historias modulares con workflows
- 🔧 **Steps**: Primitivas para construcción de workflows durables
- 📊 **Schema & Service**: Dominio de InstantDB para contexts, events y executions
- 📝 **Document Parser**: Procesamiento de documentos con LlamaCloud
- 🏗️ **Domain Utilities**: Utilidades para definir esquemas de InstantDB

**Instalación:**
```bash
pnpm add ekairos
```

**Uso:**
```typescript
import { story, engine, storyRunner, domain } from 'ekairos';
import { Agent } from 'ekairos'; // Clase legacy
```

### `@ekairos/dataset` (Paquete Separado)
Herramientas especializadas para procesamiento de datasets con IA:
- 📊 Generación de schemas
- 🔄 Transformación de datasets
- 🐍 Scripts Python para preview de datos
- 🤖 Agentes especializados (FileDatasetAgent, TransformDatasetAgent)

**Instalación:**
```bash
pnpm add @ekairos/dataset
```

**Uso:**
```typescript
import { DatasetService } from '@ekairos/dataset';
import { FileDatasetAgent } from '@ekairos/dataset';
```

### Paquetes Internos (Uso Avanzado)
- **`@ekairos/story`** - Usado internamente por `ekairos`
- **`@ekairos/domain`** - Usado internamente por `ekairos`

## 🚀 Desarrollo

### Setup inicial
```bash
cd c:\Users\aleja\storias\projects\pulzar\pulzar-lib-core
pnpm install
pnpm build
```

### Comandos disponibles
```bash
# Build de todos los paquetes
pnpm build

# Build de un paquete específico
pnpm --filter @ekairos/story build

# Dev mode (watch) en todos los paquetes
pnpm dev

# Dev mode en un paquete específico
pnpm --filter @ekairos/story dev

# Limpiar builds
pnpm clean

# Typecheck
pnpm typecheck

# Ejecutar workbench de ejemplo
pnpm --filter @ekairos/example-workbench dev
```

## 🎯 Workbench

El directorio `workbench/example` contiene un ejemplo funcional de cómo usar `@ekairos/story` con el motor de historias y workflows.

```bash
pnpm --filter @ekairos/example-workbench dev
```

## 📚 Uso del Story Engine

### 1. Definir y registrar una historia

```typescript
// stories.ts
import { story, engine, type StoryActionSpec } from '@ekairos/story';

const myStory: {
  key: string;
  narrative: string;
  actions: StoryActionSpec[];
  options?: any;
  callbacks?: any;
} = {
  key: 'platform:my-story',
  narrative: 'Asistente que ayuda con...',
  actions: [
    {
      name: 'updateEntity',
      description: 'Actualiza una entidad',
      implementationKey: 'platform.updateEntity',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', required: true, description: 'ID de la entidad' },
          title: { type: 'string', description: 'Nuevo título' },
        },
      },
      finalize: true,
      // Función no serializable (se ejecuta en el runtime)
      execute: async ({ id, title, contextId }) => {
        // Código con efectos secundarios, DB, APIs, etc.
        console.log(`Updating ${id} with title ${title}`);
        return { success: true };
      },
    },
  ],
  options: {
    reasoningEffort: 'medium',
    maxLoops: 10,
    includeBaseTools: {
      createMessage: true,
      requestDirection: true,
      end: true,
    },
  },
  callbacks: {
    evaluateToolCalls: async (toolCalls) => ({ success: true }),
    onEnd: async (lastEvent) => ({ end: true }),
  },
};

// Registrar en el engine global
export const storyEngineInstance = engine.register(myStory);
export const storyDescriptor = storyEngineInstance.story('platform:my-story');
```

### 2. Crear un workflow con Next.js + Workflow DevKit

```typescript
// app/workflows/my-story.ts
import { storyRunner } from '@ekairos/story';
import { storyDescriptor } from '@/stories';

export async function myStoryWorkflow(args?: { context?: any }) {
  "use workflow"; // Directiva para el loader de Next.js
  return storyRunner(storyDescriptor, args);
}
```

### 3. Configurar Next.js

```typescript
// next.config.ts
import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ekairos/story', '@ekairos/domain', '@ekairos/dataset'],
};

export default withWorkflow(nextConfig);
```

### 4. Disparar el workflow

```typescript
// route.ts o server action
import { start } from 'workflow/api';
import { myStoryWorkflow } from '@/app/workflows/my-story';

export async function POST() {
  const run = await start(myStoryWorkflow, [{ context: null }]);
  return Response.json({ runId: run.runId });
}
```

## 🏗️ Arquitectura

```
@ekairos/story           (Paquete principal)
  ├── Agent/Story        (Agentes durables legacy)
  ├── Story Engine       (Sistema modular de historias)
  ├── Story Runner       (Workflow con "use workflow")
  ├── Steps              (Primitivas: ai, base, registry, context)
  ├── Schema & Service   (DB: story_contexts, story_events, story_executions)
  └── Document Parser    (LlamaCloud integration)

@ekairos/domain          (Utilidades de esquemas)
  └── domain()           (Función para crear dominios componibles)

@ekairos/dataset         (Herramientas de datasets)
  ├── Dataset Service
  ├── Dataset Agents     (File, Transform)
  └── Tools              (Clear, Complete, Execute, Generate Schema)
```

## 📝 Diferencias entre Story API y Story Engine

### Story API (Clase `Agent`/`Story`)
API de clase abstracta para agentes conversacionales con streaming:

```typescript
class MyAgent extends Agent<MyContext> {
  protected async buildSystemPrompt(context) { /* ... */ }
  protected async buildTools(context, dataStream) { /* ... */ }
  protected async initialize(context) { /* ... */ }
}
```

### Story Engine (Función `story()`)
API funcional para historias modulares con workflows:

```typescript
const myStory = story('key', {
  narrative: 'System prompt...',
  actions: [/* tools */],
  options: { /* ... */ }
});

// En workflow file:
export async function myWorkflow() {
  "use workflow";
  return storyRunner(descriptor, args);
}
```

## 🔄 Migración desde paquete monolítico

Ver [MONOREPO_MIGRATION.md](./MONOREPO_MIGRATION.md) para detalles de la migración.

## 📄 Licencia

MIT

## 🔗 Links

- [Workflow DevKit](https://github.com/vercel/workflow) - Sistema de workflows durables
- [InstantDB](https://www.instantdb.com/) - Base de datos
