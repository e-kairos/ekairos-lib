## Iteración Final (Iterable, se debe editar agregando informacion de ejecución como findings. Experimentos realizados con sus resultados y demás.)

### Reflexión

Objetivo original: que el test Playwright `playwright/workflow.spec.ts` pase en verde. El usuario indica que es el test definitivo y que se ejecute hasta funcionar. Necesitamos observar logs para entender el fallo actual (`Workflow ... undefined`).

Nuevos hallazgos clave:
- El bundle server `app/api/test/route.js` sí importa `storyRunner` desde `packages/story/dist/storyRunner.js` con metadata `workflowId`. El stub lanzando el error demuestra que el transformador SWC se aplicó correctamente sobre la librería.
- El builder de workflows (`@workflow/cli` dentro de `withWorkflow`) sólo escanea entradas `['pages', 'app', 'src/pages', 'src/app']` y filtra archivos que contengan `route|page|layout` (ver `packages/cli/src/lib/builders/next-build.ts`, método `getInputFiles`). Por tanto, archivos como `app/workflows/test-story.ts` o `packages/story/src/storyRunner.ts` no se incluyen en el bundle de workflows.
- El manifest generado en `app/.well-known/workflow/v1/flow/manifest.debug.json` permanece `{}` y `route.js` sólo inicializa `globalThis.__private_workflows = new Map();`, confirmando que ningún workflow fue registrado durante `build`.
- Los runs en `.next/workflow-data/runs/wrun_01K8ETKJXQ56WPA3VHE7A7PRKV.json` siguen fallando con `storyRunner` “undefined”, porque al ejecutarse dentro de la VM busca `globalThis.__private_workflows.get(workflowName)` y no encuentra implementación.

### Plan

1. Ejecutar `pnpm test:e2e -- --reporter=list` (único test Playwright disponible).
2. Registrar logs de Next.js y del run fallido en `.next/workflow-data/runs` para identificar causa.
3. Analizar por qué `testStoryWorkflow` sigue sin registrarse tras limpiar `.next` (probable falta de discovery de `app/workflows`).
4. Alternativa para validar el pipeline: iniciar el workflow usando directamente `storyRunner` (que tiene `"use workflow"` en cabecera en `packages/story/src/storyRunner.ts`, L9), eliminando la dependencia de `app/workflows/test-story.ts` mientras se investiga la discovery.
5. Determinar cómo proveer al builder una entrada válida (archivo `route|page|layout`) que importe los workflows de la librería o ampliar la configuración para incluir `packages/story`.

### Ejecución

1. Confirmé que el bundle generado en `app/.well-known/workflow/v1/flow/route.js` contiene un `__private_workflows` vacío y `manifest.debug.json` es `{}` (no workflows descubiertos).
2. Actualicé `app/api/test/route.ts` para iniciar el workflow con `start(storyRunner, ['workbench:test-story', { context }])` importándolo directamente desde la librería `ekairos` (fuente única del runner). Eliminé el wrapper local para evitar duplicidad.
3. Próximo: ejecutar `pnpm test:e2e -- --reporter=list` para validar que el workflow ahora avanza a ejecución (si falla, que sea por la implementación core/steps, no por `undefined`).
4. Resultado repetido: el test e2e arroja 500; los logs en `.next/workflow-data/runs` muestran que `workflow//...storyRunner` sigue resolviendo a `undefined`. La causa es la ausencia del workflow en `__private_workflows`. Necesitamos ajustar la discovery: agregar un entrypoint tipo `app/workflows/_workflow/route.ts` que importe los workflows de la librería o modificar la configuración del builder para escanear `packages/story`.

