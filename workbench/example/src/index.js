"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ekairos_1 = require("ekairos");
// Definir una story de ejemplo
const exampleStory = {
    key: 'workbench:example-story',
    narrative: 'Asistente que ayuda a procesar datos',
    actions: [
        {
            name: 'processData',
            description: 'Procesa datos de entrada',
            implementationKey: 'example.processData',
            inputSchema: {
                type: 'object',
                properties: {
                    data: { type: 'string', required: true, description: 'Datos a procesar' },
                },
            },
            finalize: false,
            // Función no serializable que se ejecuta en el runtime
            execute: async ({ data, contextId }) => {
                console.log(`[processData] Processing: ${data} for context ${contextId}`);
                return { ok: true, processed: data.toUpperCase() };
            },
        },
        {
            name: 'complete',
            description: 'Completa el procesamiento',
            implementationKey: 'example.complete',
            inputSchema: {
                type: 'object',
                properties: {
                    result: { type: 'string', description: 'Resultado final' },
                },
            },
            finalize: true,
            execute: async ({ result, contextId }) => {
                console.log(`[complete] Finalizing with result: ${result} for context ${contextId}`);
                return { ok: true, completed: true };
            },
        },
    ],
    options: {
        reasoningEffort: 'medium',
        maxLoops: 5,
        includeBaseTools: {
            createMessage: true,
            end: true,
        },
    },
    callbacks: {
        evaluateToolCalls: async (toolCalls) => {
            console.log(`[evaluateToolCalls] Evaluating ${toolCalls.length} tool calls`);
            return { success: true };
        },
        onEnd: async (lastEvent) => {
            console.log('[onEnd] Story completed', lastEvent);
            return { end: true };
        },
    },
};
// Registrar la story en el engine global
console.log('Registering story...');
const storyEngineInstance = ekairos_1.engine.register(exampleStory);
// Obtener el descriptor serializable
const descriptor = storyEngineInstance.story('workbench:example-story');
console.log('Story descriptor:', JSON.stringify(descriptor, null, 2));
// Ejemplo de cómo se usaría con el workflow runner
// En una aplicación real, esto se exportaría como un workflow con "use workflow"
console.log('\nExample workflow would be:');
console.log(`
export async function exampleWorkflow(args?: { context?: any }) {
  "use workflow";
  return storyRunner(descriptor, args);
}

// Y luego se dispararía con:
// await start(exampleWorkflow, [{ context: null }]);
`);
console.log('\n✅ Workbench example loaded successfully!');
console.log('Story registered with key:', exampleStory.key);
