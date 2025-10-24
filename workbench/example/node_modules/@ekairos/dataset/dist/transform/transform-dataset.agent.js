"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformDatasetAgent = void 0;
const story_1 = require("@ekairos/story");
const story_2 = require("@ekairos/story");
const completeDataset_tool_1 = require("../completeDataset.tool");
const executeCommand_tool_1 = require("../executeCommand.tool");
const clearDataset_tool_1 = require("../clearDataset.tool");
const prompts_1 = require("./prompts");
const datasetFiles_1 = require("../datasetFiles");
const admin_1 = require("@instantdb/admin");
const story_3 = require("@ekairos/story");
const service_1 = require("../service");
const filepreview_1 = require("./filepreview");
class InternalTransformDatasetAgent extends story_1.Agent {
    constructor(opts) {
        super(opts);
        this.isSandboxInitialized = false;
        this.sandboxSourcePaths = [];
        this.datasetId = (0, admin_1.id)();
        this.sourceDatasetIds = opts.sourceDatasetIds;
        this.outputSchema = opts.outputSchema;
        this.sandbox = opts.sandbox;
        this.service = opts.service;
        this.instructions = opts.instructions;
    }
    getDatasetId() {
        return this.datasetId;
    }
    async ensureSourcesInSandbox() {
        if (this.isSandboxInitialized) {
            return { sourcePaths: this.sandboxSourcePaths, outputPath: (0, datasetFiles_1.getDatasetOutputPath)(this.datasetId) };
        }
        const workstation = (0, datasetFiles_1.getDatasetWorkstation)(this.datasetId);
        await this.sandbox.runCommand({
            cmd: "mkdir",
            args: ["-p", workstation],
        });
        const sourcePaths = [];
        for (const sourceDatasetId of this.sourceDatasetIds) {
            const existingSourcePath = (0, datasetFiles_1.getDatasetOutputPath)(sourceDatasetId);
            const sourceExists = await this.sandbox.runCommand({
                cmd: "test",
                args: ["-f", existingSourcePath],
            });
            if (sourceExists.exitCode === 0) {
                sourcePaths.push({ datasetId: sourceDatasetId, path: existingSourcePath });
                continue;
            }
            const storagePath = `/dataset/${sourceDatasetId}/output.jsonl`;
            const fileQuery = await this.db.query({
                $files: {
                    $: {
                        where: { path: storagePath },
                        limit: 1,
                    },
                },
            });
            const fileRecord = Array.isArray(fileQuery.$files) ? fileQuery.$files[0] : undefined;
            if (!fileRecord || !fileRecord.url) {
                throw new Error(`Source dataset output not found for datasetId=${sourceDatasetId}`);
            }
            const fileBuffer = await fetch(fileRecord.url).then((r) => r.arrayBuffer());
            const sourcePath = `${workstation}/source_${sourceDatasetId}.jsonl`;
            await this.sandbox.writeFiles([
                {
                    path: sourcePath,
                    content: Buffer.from(fileBuffer),
                },
            ]);
            sourcePaths.push({ datasetId: sourceDatasetId, path: sourcePath });
        }
        this.sandboxSourcePaths = sourcePaths;
        this.isSandboxInitialized = true;
        return { sourcePaths, outputPath: (0, datasetFiles_1.getDatasetOutputPath)(this.datasetId) };
    }
    async initialize(context) {
        const { sourcePaths, outputPath } = await this.ensureSourcesInSandbox();
        const sourcePreviews = [];
        for (const sourcePathInfo of sourcePaths) {
            try {
                const preview = await (0, filepreview_1.generateSourcePreview)(this.sandbox, sourcePathInfo.path, this.datasetId);
                sourcePreviews.push({ datasetId: sourcePathInfo.datasetId, preview });
            }
            catch (error) {
                console.error(`[TransformDatasetAgent ${this.datasetId}] Failed to generate source preview for ${sourcePathInfo.datasetId}:`, error);
            }
        }
        try {
            await this.service.updateDatasetSchema({
                datasetId: this.datasetId,
                schema: this.outputSchema,
                status: "schema_complete",
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[TransformDatasetAgent ${this.datasetId}] Failed to persist output schema:`, message);
        }
        return {
            datasetId: this.datasetId,
            sourceDatasetIds: this.sourceDatasetIds,
            outputSchema: this.outputSchema,
            sandboxConfig: {
                sourcePaths: sourcePaths,
                outputPath: outputPath,
            },
            sourcePreviews: sourcePreviews.length > 0 ? sourcePreviews : undefined,
            errors: [],
            iterationCount: 0,
            instructions: this.instructions,
        };
    }
    async buildSystemPrompt(context) {
        const promptContext = {
            datasetId: context.content.datasetId,
            sourceDatasetIds: context.content.sourceDatasetIds,
            outputSchema: context.content.outputSchema,
            sandboxConfig: {
                sourcePaths: context.content.sandboxConfig.sourcePaths,
                outputPath: context.content.sandboxConfig.outputPath,
            },
            sourcePreviews: context.content.sourcePreviews,
            errors: context.content.errors,
        };
        let basePrompt = (0, prompts_1.buildTransformDatasetPrompt)(promptContext);
        // Append instructions if provided
        if (context.content.instructions) {
            basePrompt += `\n\n## ADDITIONAL CONTEXT AND INSTRUCTIONS\n\n${context.content.instructions}`;
        }
        return basePrompt;
    }
    async buildTools(context, dataStream) {
        const ctx = context.content;
        return {
            executeCommand: (0, executeCommand_tool_1.createExecuteCommandTool)({
                service: this.service,
                datasetId: ctx.datasetId,
                sandbox: this.sandbox,
            }),
            completeDataset: (0, completeDataset_tool_1.createCompleteDatasetTool)({
                service: this.service,
                datasetId: ctx.datasetId,
                sandbox: this.sandbox,
            }),
            clearDataset: (0, clearDataset_tool_1.createClearDatasetTool)({
                service: this.service,
                datasetId: ctx.datasetId,
                sandbox: this.sandbox,
            }),
        };
    }
    getModel(_context) {
        return "gpt-5-codex";
    }
    includeBaseTools() {
        return { createMessage: false, requestDirection: false, end: false };
    }
    async getFinalizationToolNames() {
        return ["completeDataset"];
    }
    async onEnd(_lastEvent) {
        return { end: false };
    }
    async onToolCallExecuted(executionEvent) {
        try {
            const name = executionEvent?.toolCall?.toolName || executionEvent?.toolCall?.name || "unknown";
            console.log(`[TransformDatasetAgent ${this.datasetId}] Tool call executed: ${name}`);
        }
        catch { }
    }
}
class TransformDatasetAgent {
    constructor(params) {
        this.sourceDatasetIds = Array.isArray(params.sourceDatasetIds) ? params.sourceDatasetIds : [params.sourceDatasetIds];
        this.outputSchema = params.outputSchema;
        this.sandbox = params.sandbox;
        this.service = new service_1.DatasetService();
        this.agentService = new story_2.AgentService();
        this.instructions = params.instructions;
    }
    async getDataset() {
        const internalAgent = new InternalTransformDatasetAgent({
            sourceDatasetIds: this.sourceDatasetIds,
            outputSchema: this.outputSchema,
            sandbox: this.sandbox,
            service: this.service,
            instructions: this.instructions,
        });
        const datasetId = internalAgent.getDatasetId();
        const datasetCountText = this.sourceDatasetIds.length === 1
            ? "the source dataset"
            : `${this.sourceDatasetIds.length} source datasets`;
        const userEvent = {
            id: (0, admin_1.id)(),
            type: story_3.USER_MESSAGE_TYPE,
            channel: story_3.WEB_CHANNEL,
            content: {
                parts: [
                    {
                        type: "text",
                        text: `Transform ${datasetCountText} into a new dataset matching the provided output schema`,
                    },
                ],
            },
            createdAt: new Date().toISOString(),
        };
        const reaction = await internalAgent.progressStream(userEvent, null);
        const stream = reaction.stream;
        const streamResult = await this.agentService.readEventStream(stream);
        if (streamResult.persistedEvent?.status !== "completed") {
            throw new Error(`Dataset transformation failed with status: ${streamResult.persistedEvent?.status}`);
        }
        const datasetResult = await this.service.getDatasetById(datasetId);
        if (!datasetResult.ok) {
            throw new Error(datasetResult.error);
        }
        const dataset = datasetResult.data;
        return {
            id: dataset.id,
            status: dataset.status,
            title: dataset.title,
            schema: dataset.schema,
            analysis: dataset.analysis,
            calculatedTotalRows: dataset.calculatedTotalRows,
            actualGeneratedRowCount: dataset.actualGeneratedRowCount,
            createdAt: dataset.createdAt,
            updatedAt: dataset.updatedAt,
        };
    }
    async followUp(datasetId, feedback) {
        const internalAgent = new InternalTransformDatasetAgent({
            sourceDatasetIds: this.sourceDatasetIds,
            outputSchema: this.outputSchema,
            sandbox: this.sandbox,
            service: this.service,
            instructions: this.instructions,
        });
        const userEvent = {
            id: (0, admin_1.id)(),
            type: story_3.USER_MESSAGE_TYPE,
            channel: story_3.WEB_CHANNEL,
            content: {
                parts: [
                    {
                        type: "text",
                        text: feedback,
                    },
                ],
            },
            createdAt: new Date().toISOString(),
        };
        const contextResult = await this.service.getContextByDatasetId(datasetId);
        if (!contextResult.ok) {
            throw new Error(contextResult.error);
        }
        const contextId = contextResult.data.id;
        const reaction = await internalAgent.progressStream(userEvent, { id: contextId });
        const stream = reaction.stream;
        const streamResult = await this.agentService.readEventStream(stream);
        if (streamResult.persistedEvent?.status !== "completed") {
            throw new Error(`Dataset transformation iteration failed with status: ${streamResult.persistedEvent?.status}`);
        }
        const datasetResult = await this.service.getDatasetById(datasetId);
        if (!datasetResult.ok) {
            throw new Error(datasetResult.error);
        }
        const dataset = datasetResult.data;
        return {
            id: dataset.id,
            status: dataset.status,
            title: dataset.title,
            schema: dataset.schema,
            analysis: dataset.analysis,
            calculatedTotalRows: dataset.calculatedTotalRows,
            actualGeneratedRowCount: dataset.actualGeneratedRowCount,
            createdAt: dataset.createdAt,
            updatedAt: dataset.updatedAt,
        };
    }
}
exports.TransformDatasetAgent = TransformDatasetAgent;
//# sourceMappingURL=transform-dataset.agent.js.map