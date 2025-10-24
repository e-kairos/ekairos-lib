"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureContextStep = ensureContextStep;
exports.buildSystemPromptStep = buildSystemPromptStep;
const service_1 = require("./service");
async function ensureContextStep(params) {
    "use step";
    const service = new service_1.AgentService();
    const selector = params.context;
    const ctx = await service.getOrCreateContext(selector ?? { key: params.key });
    return { contextId: ctx.id };
}
async function buildSystemPromptStep(params) {
    "use step";
    // Por ahora el prompt es plano, concatenando narrativa y metadatos básicos de contexto
    // No modificar prompts de negocio existentes; este es un prompt genérico de Story
    const systemPrompt = `${params.narrative}\n\n[context]\ncontextId: ${params.contextId}`;
    return systemPrompt;
}
//# sourceMappingURL=steps-context.js.map