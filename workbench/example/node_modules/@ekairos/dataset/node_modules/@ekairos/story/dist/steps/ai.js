"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReasoningOnceStep = runReasoningOnceStep;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const zod_1 = require("zod");
const admin_1 = require("@instantdb/admin");
const events_1 = require("../events");
function zodFromField(field) {
    switch (field.type) {
        case "string":
            return zod_1.z.string().describe(field.description ?? "");
        case "number":
            return zod_1.z.number().describe(field.description ?? "");
        case "boolean":
            return zod_1.z.boolean().describe(field.description ?? "");
        case "array":
            if (!field.items)
                return zod_1.z.array(zod_1.z.any()).describe(field.description ?? "");
            return zod_1.z.array(zodFromField(field.items)).describe(field.description ?? "");
        case "object":
            return zod_1.z.object(Object.fromEntries(Object.entries(field.properties ?? {}).map(([k, v]) => [k, zodFromField(v)])))
                .describe(field.description ?? "");
        default:
            return zod_1.z.any();
    }
}
function zodFromSchema(schema) {
    if (!schema || schema.type !== "object")
        return zod_1.z.object({}).strict();
    const shape = {};
    for (const [name, field] of Object.entries(schema.properties ?? {})) {
        const base = zodFromField(field);
        shape[name] = field.required ? base : base.optional();
    }
    const obj = zod_1.z.object(shape);
    return obj;
}
async function runReasoningOnceStep(params) {
    "use step";
    // Construir tools para el modelo sin ejecutar (sin execute)
    const tools = {};
    const includeBase = params.options?.includeBaseTools || { createMessage: true, requestDirection: true, end: true };
    for (const action of params.actions) {
        const inputSchema = zodFromSchema(action.inputSchema);
        tools[action.name] = (0, ai_1.tool)({
            description: action.description,
            inputSchema: inputSchema,
        });
    }
    if (includeBase.createMessage) {
        tools.createMessage = (0, ai_1.tool)({
            description: "Send a message to the user. Use for final confirmations or information.",
            inputSchema: zod_1.z.object({ message: zod_1.z.string().describe("Markdown content") }),
        });
    }
    if (includeBase.requestDirection) {
        tools.requestDirection = (0, ai_1.tool)({
            description: "Ask a human for guidance when blocked or unsure.",
            inputSchema: zod_1.z.object({ issue: zod_1.z.string(), context: zod_1.z.string(), suggestedActions: zod_1.z.array(zod_1.z.string()).optional(), urgency: zod_1.z.enum(["low", "medium", "high"]).default("medium") }),
        });
    }
    if (includeBase.end) {
        tools.end = (0, ai_1.tool)({
            description: "End the current interaction loop.",
            inputSchema: zod_1.z.object({}).strict(),
        });
    }
    const providerOptions = {};
    if (params.options?.reasoningEffort) {
        providerOptions.openai = {
            reasoningEffort: params.options.reasoningEffort,
            reasoningSummary: "detailed",
        };
    }
    const result = (0, ai_1.streamText)({
        model: (0, openai_1.openai)("gpt-4o-mini"),
        system: params.systemPrompt,
        messages: [],
        tools,
        toolChoice: "required",
        stopWhen: (0, ai_1.stepCountIs)(1),
        ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
    });
    result.consumeStream();
    let resolveFinish;
    let rejectFinish;
    const finishPromise = new Promise((resolve, reject) => {
        resolveFinish = resolve;
        rejectFinish = reject;
    });
    const eventId = (0, admin_1.id)();
    result
        .toUIMessageStream({
        sendStart: false,
        generateMessageId: () => eventId,
        messageMetadata() {
            return { eventId };
        },
        onFinish: ({ messages }) => {
            const lastEvent = (0, events_1.createAssistantEventFromUIMessages)(eventId, messages);
            resolveFinish(lastEvent);
        },
        onError: (e) => {
            rejectFinish(e);
            const message = e instanceof Error ? e.message : String(e);
            return message;
        },
    })
        .pipeThrough(new TransformStream({
        transform(chunk, controller) {
            if (chunk.type === "start")
                return;
            if (chunk.type === "finish-step")
                return;
            if (chunk.type === "start-step")
                return;
            if (chunk.type === "finish")
                return;
            controller.enqueue(chunk);
        },
    }));
    const lastEvent = await finishPromise;
    const toolCalls = [];
    try {
        for (const p of lastEvent.content.parts || []) {
            if (typeof p.type === "string" && p.type.startsWith("tool-")) {
                const toolName = p.type.split("-")[1];
                toolCalls.push({ toolCallId: p.toolCallId, toolName, args: p.input });
            }
        }
    }
    catch { }
    return { toolCalls };
}
//# sourceMappingURL=ai.js.map