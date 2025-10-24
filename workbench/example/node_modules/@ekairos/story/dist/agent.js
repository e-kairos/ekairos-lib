"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = exports.Story = void 0;
const admin_1 = require("@instantdb/admin");
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const zod_1 = require("zod");
const braintrust_1 = require("braintrust");
const service_1 = require("./service");
const events_1 = require("./events");
// Inicializar Braintrust logger
const logger = (0, braintrust_1.initLogger)({
    projectName: "pulzar platform",
    apiKey: process.env.BRAINTRUST_API_KEY,
});
const createDataStream = ai_1.createUIMessageStream;
class Story {
    constructor(opts = {}) {
        this.opts = opts;
        this.db = (0, admin_1.init)({
            appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
            adminToken: process.env.INSTANT_APP_ADMIN_TOKEN
        });
        this.agentService = new service_1.AgentService();
    }
    getModel(context) {
        return "openai/gpt-5";
    }
    includeBaseTools() {
        return { createMessage: true, requestDirection: true, end: true };
    }
    async getFinalizationToolNames() {
        return [];
    }
    getBaseTools(dataStream, threadId) {
        const include = this.includeBaseTools();
        const baseTools = {};
        if (include.createMessage) {
            baseTools.createMessage = (0, ai_1.tool)({
                description: "Send a message to the user. Use for final confirmations or information.",
                inputSchema: zod_1.z.object({
                    message: zod_1.z.string().describe("Message for the user in markdown format")
                }),
            });
        }
        if (include.requestDirection) {
            baseTools.requestDirection = (0, ai_1.tool)({
                description: "Ask a human for guidance when blocked or unsure.",
                inputSchema: zod_1.z.object({
                    issue: zod_1.z.string(),
                    context: zod_1.z.string(),
                    suggestedActions: zod_1.z.array(zod_1.z.string()).optional(),
                    urgency: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
                }),
            });
        }
        if (include.end) {
            baseTools.end = (0, ai_1.tool)({
                description: "End the current interaction loop.",
                inputSchema: zod_1.z.object({}).strict(),
                execute: async () => {
                    return { success: true, message: "Ended" };
                },
            });
        }
        return baseTools;
    }
    async executeCreateMessage(eventId, args, threadId, dataStream) {
        const assistantMessage = { id: eventId, role: "assistant", content: args.message, createdAt: new Date() };
        try {
            await this.saveMessagesToThread(threadId, [assistantMessage]);
        }
        catch { }
        if (dataStream) {
            //dataStream.writeData({ type: "user-response", message: args.message, responseType: args.type, includeContext: Boolean(args.includeContext), timestamp: new Date().toISOString() } as any)
        }
        return { success: true, message: args.message, data: { messageId: assistantMessage.id, threadId } };
    }
    async executeRequestDirection(eventId, args, threadId, _dataStream) {
        const systemMessage = { id: eventId, role: "assistant", content: `Direction requested: ${args.issue}\nContext: ${args.context}`, createdAt: new Date() };
        return { success: true, message: "Direction requested", data: { messageId: systemMessage.id, threadId } };
    }
    async progressStream(incomingEvent, contextIdentifier, options) {
        // get or create context
        const currentContext = await this.agentService.getOrCreateContext(contextIdentifier);
        const contextSelector = contextIdentifier?.id
            ? { id: contextIdentifier.id }
            : contextIdentifier?.key
                ? { key: contextIdentifier.key }
                : { id: currentContext.id };
        // save incoming event
        const triggerEvent = await this.agentService.saveEvent(contextSelector, incomingEvent);
        const triggerEventId = triggerEvent.id; // trigger event id
        const eventId = (0, admin_1.id)(); // reaction event id
        // create execution and set context status
        const execution = await this.agentService.createExecution(contextSelector, triggerEventId, eventId);
        const executionId = execution.id;
        let latestReactionEvent = null;
        let executionStatus = "executing";
        const markFailure = async () => {
            if (latestReactionEvent && latestReactionEvent.status !== "failed") {
                try {
                    latestReactionEvent = await this.agentService.updateEvent(latestReactionEvent.id, {
                        ...latestReactionEvent,
                        status: "failed",
                    });
                }
                catch (eventError) {
                    console.error("Failed to mark reaction event as failed", eventError);
                }
            }
            if (executionStatus === "executing") {
                try {
                    await this.agentService.completeExecution(contextSelector, executionId, "failed");
                    executionStatus = "failed";
                }
                catch (executionError) {
                    console.error("Failed to mark execution as failed", executionError);
                }
            }
        };
        const dataStreamResult = createDataStream({
            execute: async ({ writer: dataStream }) => {
                let loopSafety = 0;
                const MAX_LOOPS = 20;
                // load previous events
                const previousEvents = await this.agentService.getEvents(contextSelector);
                const events = previousEvents;
                const contextId = currentContext.id;
                let reactionEvent = await this.agentService.saveEvent(contextSelector, {
                    id: eventId,
                    type: "assistant",
                    channel: "agent",
                    createdAt: new Date().toISOString(),
                    content: { parts: [] },
                    status: "pending",
                });
                latestReactionEvent = reactionEvent;
                dataStream.write({ type: "event-start", data: { eventId: eventId } });
                while (loopSafety < MAX_LOOPS) {
                    dataStream.write({ type: "start-step" });
                    loopSafety++;
                    // Read context
                    const currentContext = await this.agentService.getContext(contextSelector);
                    dataStream.write({ type: "data-context-id", data: { contextId: currentContext.id } });
                    // Initialize on each loop and get new context data
                    const contextContent = await this.initialize(currentContext);
                    // Update context
                    const updatedContext = await this.agentService.updateContextContent({ id: currentContext.id }, contextContent);
                    // Build tools
                    const subclassToolsAll = await this.buildTools(updatedContext, dataStream);
                    // Build base tools for agent loop control
                    const baseTools = this.getBaseTools(dataStream, updatedContext.id);
                    const tools = { ...subclassToolsAll, ...baseTools };
                    // Add web search if enabled
                    if (options?.webSearch) {
                        tools.web_search = openai_1.openai.tools.webSearch();
                    }
                    // Extract execute functions from tools
                    const executeMap = {};
                    for (const [name, t] of Object.entries(subclassToolsAll)) {
                        if (t.execute) {
                            executeMap[name] = t.execute;
                        }
                    }
                    const include = this.includeBaseTools();
                    if (include.createMessage) {
                        executeMap["createMessage"] = (args) => this.executeCreateMessage(eventId, args, updatedContext.id, dataStream);
                    }
                    if (include.requestDirection) {
                        executeMap["requestDirection"] = (args) => this.executeRequestDirection(eventId, args, updatedContext.id, dataStream);
                    }
                    for (const [, t] of Object.entries(tools)) {
                        delete t.execute;
                    }
                    const messagesForModel = await (0, events_1.convertEventsToModelMessages)(reactionEvent.status !== "pending"
                        ? [...events, reactionEvent]
                        : [...events]);
                    const systemPrompt = await this.buildSystemPrompt(updatedContext);
                    const providerOptions = {};
                    if (options?.reasoningEffort) {
                        providerOptions.openai = {
                            reasoningEffort: options.reasoningEffort,
                            reasoningSummary: 'detailed',
                        };
                    }
                    const result = (0, ai_1.streamText)({
                        model: this.getModel(updatedContext),
                        system: systemPrompt,
                        messages: messagesForModel,
                        tools,
                        toolChoice: "required",
                        onStepFinish: (step) => {
                            console.log("onStepFinish", step);
                        },
                        stopWhen: (0, ai_1.stepCountIs)(1),
                        experimental_transform: (0, ai_1.smoothStream)({
                            delayInMs: 30,
                            chunking: 'word',
                        }),
                        ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
                    });
                    result.consumeStream();
                    // create promise
                    let resolveFinish;
                    let rejectFinish;
                    const finishPromise = new Promise((resolve, reject) => {
                        resolveFinish = resolve;
                        rejectFinish = reject;
                    });
                    dataStream.merge(result.toUIMessageStream({
                        sendStart: false,
                        generateMessageId: () => {
                            return eventId;
                        },
                        messageMetadata(options) {
                            return {
                                eventId: eventId,
                            };
                        },
                        onFinish: ({ messages }) => {
                            console.log("messages", messages);
                            const lastEvent = (0, events_1.createAssistantEventFromUIMessages)(eventId, messages);
                            resolveFinish(lastEvent);
                        },
                        onError: (e) => {
                            console.error("Agent error:", e);
                            rejectFinish(e);
                            const message = e instanceof Error ? e.message : String(e);
                            return message;
                        }
                    }).pipeThrough(new TransformStream({
                        transform(chunk, controller) {
                            if (chunk.type === "start") {
                                return;
                            }
                            if (chunk.type === "finish-step") {
                                return;
                            }
                            if (chunk.type === "start-step") {
                                return;
                            }
                            if (chunk.type === "finish") {
                                return;
                            }
                            controller.enqueue(chunk);
                        }
                    })));
                    // wait for the on finish here
                    const lastEvent = await finishPromise;
                    const toolCalls = lastEvent.content.parts.reduce((acc, p) => {
                        if (typeof p.type === "string" && p.type.startsWith("tool-")) {
                            const toolName = p.type.split("-")[1];
                            acc.push({ toolCallId: p.toolCallId, toolName: toolName, args: p.input });
                        }
                        return acc;
                    }, []);
                    console.log("agent.toolCalls.detected", {
                        eventId,
                        toolCalls: toolCalls.map((call) => ({ toolCallId: call.toolCallId, toolName: call.toolName }))
                    });
                    if (!toolCalls.length) {
                        const shouldEndInteraction = await this.callOnEnd(lastEvent);
                        if (shouldEndInteraction) {
                            break;
                        }
                        continue;
                    }
                    const reactionEventWithParts = {
                        ...reactionEvent,
                        content: { parts: [...reactionEvent.content.parts, ...lastEvent.content.parts] },
                    };
                    let currentEventState = await this.agentService.updateEvent(reactionEvent.id, reactionEventWithParts);
                    latestReactionEvent = currentEventState;
                    const executionResults = await Promise.all(toolCalls.map(async (tc) => {
                        console.log("agent.toolCall.selected", {
                            eventId,
                            toolCallId: tc.toolCallId,
                            toolName: tc.toolName
                        });
                        let execSuccess = true;
                        let execMessage = "Executed";
                        let execResult = null;
                        try {
                            const execFn = executeMap[tc.toolName];
                            if (execFn) {
                                console.log("agent.toolCall.execute.start", { toolCallId: tc.toolCallId, toolName: tc.toolName });
                                execResult = await execFn(tc.args);
                                execSuccess = execResult?.success !== false;
                                execMessage = execResult?.message || execMessage;
                                console.log("agent.toolCall.execute.success", {
                                    toolCallId: tc.toolCallId,
                                    toolName: tc.toolName,
                                    success: execSuccess
                                });
                                console.log("agent.toolCall.execute.result", {
                                    toolCallId: tc.toolCallId,
                                    toolName: tc.toolName,
                                    result: execResult
                                });
                            }
                        }
                        catch (err) {
                            execSuccess = false;
                            execMessage = err.message;
                            console.error("agent.toolCall.execute.error", {
                                toolCallId: tc.toolCallId,
                                toolName: tc.toolName,
                                error: err
                            });
                        }
                        return { tc, execSuccess, execMessage, execResult };
                    }));
                    let exitOuterLoop = false;
                    const customFinalizationTools = await this.getFinalizationToolNames();
                    const allFinalToolNames = [...Story.FINAL_TOOL_NAMES, ...customFinalizationTools];
                    for (const { tc, execSuccess, execMessage, execResult } of executionResults) {
                        try {
                            if (execSuccess) {
                                dataStream.write({
                                    type: "tool-output-available",
                                    toolCallId: tc.toolCallId,
                                    output: execResult,
                                });
                            }
                            else {
                                dataStream.write({
                                    type: "tool-output-error",
                                    toolCallId: tc.toolCallId,
                                    errorText: String(execMessage || "Error"),
                                });
                            }
                        }
                        catch (e) {
                            console.error("Failed to write tool result to stream", e);
                        }
                        const existingParts = currentEventState?.content?.parts || [];
                        const mergedParts = existingParts.map((p) => {
                            if (p.type === `tool-${tc.toolName}` && p.toolCallId === tc.toolCallId) {
                                if (execSuccess) {
                                    return {
                                        ...p,
                                        state: "output-available",
                                        output: execResult,
                                    };
                                }
                                return {
                                    ...p,
                                    state: "output-error",
                                    errorText: String(execMessage || "Error"),
                                };
                            }
                            return p;
                        });
                        currentEventState = await this.agentService.updateEvent(currentEventState.id, {
                            id: currentEventState.id,
                            type: currentEventState.type,
                            channel: "agent",
                            createdAt: currentEventState.createdAt,
                            content: { parts: mergedParts },
                        });
                        dataStream.write({ type: "finish-step" });
                        await this.opts.onToolCallExecuted?.({
                            id: currentEventState.id,
                            toolCall: tc,
                            event: currentEventState.id,
                            success: execSuccess,
                            message: execMessage,
                            result: execResult,
                        });
                        let shouldEnd = false;
                        if (!execSuccess) {
                            const shouldEndInteraction = await this.callOnEnd(lastEvent);
                            if (shouldEndInteraction) {
                                shouldEnd = true;
                            }
                        }
                        if (!shouldEnd) {
                            if (allFinalToolNames.includes(tc.toolName)) {
                                const shouldEndInteraction = await this.callOnEnd(lastEvent);
                                if (shouldEndInteraction) {
                                    shouldEnd = true;
                                }
                            }
                        }
                        if (shouldEnd) {
                            dataStream.write({ type: "finish", override: true });
                            exitOuterLoop = true;
                            break;
                        }
                    }
                    reactionEvent = currentEventState;
                    if (exitOuterLoop) {
                        break;
                    }
                }
                reactionEvent = await this.agentService.updateEvent(reactionEvent.id, {
                    ...reactionEvent,
                    status: "completed",
                });
                latestReactionEvent = reactionEvent;
                try {
                    await this.agentService.completeExecution(contextSelector, executionId, "completed");
                    executionStatus = "completed";
                }
                catch (error) {
                    console.error("Failed to mark execution as completed", error);
                }
            },
            onError: (error) => {
                console.error("Agent error:", error);
                void markFailure();
                return error instanceof Error ? error.message : String(error);
            },
            onFinish: async () => {
                if (executionStatus === "executing") {
                    try {
                        await this.agentService.completeExecution(contextSelector, executionId, "completed");
                        executionStatus = "completed";
                    }
                    catch (executionError) {
                        console.error("Failed to finalize execution on finish", executionError);
                    }
                }
                console.log("Agent finished");
            }
        });
        // start the stream
        const dataStreamFilteredResult = dataStreamResult.pipeThrough(new TransformStream({
            transform(chunk, controller) {
                if (chunk.type === "start") {
                    console.log("start", chunk.data);
                    return;
                }
                if (chunk.type === "event-start") {
                    controller.enqueue({ type: "start", messageId: chunk.data.eventId });
                    return;
                }
                controller.enqueue(chunk);
            }
        }));
        return {
            contextId: currentContext.id,
            triggerEventId,
            reactionEventId: eventId,
            stream: dataStreamFilteredResult,
            executionId,
        };
    }
    async saveMessagesToThread(threadId, messages) {
        // Placeholder for persistence hook. Not implemented in current scope.
        return;
    }
    async callOnEnd(lastEvent) {
        if (!this.opts.onEnd) {
            return true;
        }
        try {
            const result = await this.opts.onEnd(lastEvent);
            if (typeof result === "boolean") {
                return result;
            }
            if (result && typeof result === "object") {
                if (Object.prototype.hasOwnProperty.call(result, "end")) {
                    return Boolean(result.end);
                }
            }
            return true;
        }
        catch (error) {
            console.error("onEnd callback failed", error);
            return true;
        }
    }
}
exports.Story = Story;
exports.Agent = Story;
Story.FINAL_TOOL_NAMES = ["createMessage", "requestDirection", "end"];
//# sourceMappingURL=agent.js.map