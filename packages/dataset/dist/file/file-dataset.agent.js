"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDatasetAgent = void 0;
const story_1 = require("@ekairos/story");
const story_2 = require("@ekairos/story");
const generateSchema_tool_1 = require("./generateSchema.tool");
const completeDataset_tool_1 = require("../completeDataset.tool");
const executeCommand_tool_1 = require("../executeCommand.tool");
const clearDataset_tool_1 = require("../clearDataset.tool");
const prompts_1 = require("./prompts");
const filepreview_1 = require("./filepreview");
const admin_1 = require("@instantdb/admin");
const story_3 = require("@ekairos/story");
const datasetFiles_1 = require("../datasetFiles");
const service_1 = require("../service");
class InternalFileDatasetAgent extends story_1.Agent {
    constructor(opts) {
        super(opts);
        this.isSandboxInitialized = false;
        this.sandboxFilePath = "";
        this.datasetId = (0, admin_1.id)();
        this.fileId = opts.fileId;
        this.instructions = opts.instructions;
        this.sandbox = opts.sandbox;
        this.service = opts.service;
    }
    getDatasetId() {
        return this.datasetId;
    }
    async initializeSandbox() {
        try {
            if (this.isSandboxInitialized) {
                return this.sandboxFilePath;
            }
            console.log(`[FileDatasetAgent ${this.datasetId}] Initializing sandbox...`);
            await (0, filepreview_1.ensurePreviewScriptsAvailable)(this.sandbox);
            console.log(`[FileDatasetAgent ${this.datasetId}] Installing Python dependencies...`);
            const pipInstall = await this.sandbox.runCommand({
                cmd: "python",
                args: ["-m", "pip", "install", "pandas", "openpyxl", "--quiet", "--upgrade"],
            });
            const installStderr = await pipInstall.stderr();
            if (installStderr && (installStderr.includes("ERROR") || installStderr.includes("FAILED"))) {
                throw new Error(`pip install failed: ${installStderr.substring(0, 300)}`);
            }
            console.log(`[FileDatasetAgent ${this.datasetId}] Fetching file from InstantDB...`);
            const fileQuery = await this.db.query({
                $files: { $: { where: { id: this.fileId }, limit: 1 } },
            });
            const fileRecord = fileQuery.$files?.[0];
            if (!fileRecord || !fileRecord.url) {
                throw new Error(`File not found: ${this.fileId}`);
            }
            console.log(`[FileDatasetAgent ${this.datasetId}] Creating dataset workstation...`);
            const workstation = (0, datasetFiles_1.getDatasetWorkstation)(this.datasetId);
            await this.sandbox.runCommand({
                cmd: "mkdir",
                args: ["-p", workstation],
            });
            const fileBuffer = await fetch(fileRecord.url).then((response) => response.arrayBuffer());
            const fileName = fileRecord["content-disposition"];
            const fileExtension = fileName.includes(".") ? fileName.substring(fileName.lastIndexOf(".")) : "";
            const sandboxFilePath = `${workstation}/${this.fileId}${fileExtension}`;
            await this.sandbox.writeFiles([
                {
                    path: sandboxFilePath,
                    content: Buffer.from(fileBuffer),
                },
            ]);
            console.log(`[FileDatasetAgent ${this.datasetId}] ✅ Workstation created: ${workstation}`);
            console.log(`[FileDatasetAgent ${this.datasetId}] ✅ File saved: ${sandboxFilePath}`);
            this.sandboxFilePath = sandboxFilePath;
            this.isSandboxInitialized = true;
            return sandboxFilePath;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[FileDatasetAgent ${this.datasetId}] ❌ Failed to initialize sandbox:`, msg);
            throw error;
        }
    }
    async initialize(context) {
        const sandboxFilePath = await this.initializeSandbox();
        let filePreview = undefined;
        try {
            filePreview = await (0, filepreview_1.generateFilePreview)(this.sandbox, sandboxFilePath, this.datasetId);
        }
        catch (error) {
            console.error(`[Dataset ${this.datasetId}] Failed to generate preview:`, error);
        }
        let schema = null;
        const datasetResult = await this.service.getDatasetById(this.datasetId);
        if (datasetResult.ok && datasetResult.data.schema) {
            schema = datasetResult.data.schema;
            console.log(`[FileDatasetAgent ${this.datasetId}] ✅ Schema loaded from database`);
        }
        else {
            console.log(`[FileDatasetAgent ${this.datasetId}] ℹ️  No schema found in database yet`);
        }
        return {
            datasetId: this.datasetId,
            fileId: this.fileId,
            instructions: this.instructions,
            sandboxConfig: {
                filePath: sandboxFilePath,
            },
            analysis: [],
            schema: schema,
            plan: null,
            executionResult: null,
            errors: [],
            iterationCount: 0,
            filePreview,
        };
    }
    async buildSystemPrompt(context) {
        console.log(`[FileDatasetAgent ${this.datasetId}] Building system prompt...`);
        console.log(`[FileDatasetAgent ${this.datasetId}] Schema present: ${!!context.content.schema}`);
        console.log(`[FileDatasetAgent ${this.datasetId}] ExecutionResult present: ${!!context.content.executionResult}`);
        console.log(`[FileDatasetAgent ${this.datasetId}] Iteration count: ${context.content.iterationCount}`);
        const prompt = (0, prompts_1.buildFileDatasetPrompt)(context.content);
        console.log(`[FileDatasetAgent ${this.datasetId}] Prompt length: ${prompt.length} chars`);
        return prompt;
    }
    async buildTools(context, dataStream) {
        const ctx = context.content;
        return {
            executeCommand: (0, executeCommand_tool_1.createExecuteCommandTool)({
                service: this.service,
                datasetId: ctx.datasetId,
                sandbox: this.sandbox,
            }),
            generateSchema: (0, generateSchema_tool_1.createGenerateSchemaTool)({
                service: this.service,
                datasetId: ctx.datasetId,
                sandbox: this.sandbox,
                fileId: this.fileId,
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
    getModel(context) {
        return "gpt-5-codex";
    }
    includeBaseTools() {
        return { createMessage: false, requestDirection: false, end: false };
    }
    async getFinalizationToolNames() {
        return ["completeDataset"];
    }
    async onEnd(lastEvent) {
        console.log(`[FileDatasetAgent ${this.datasetId}] On end called`);
        return { end: false }; // dont stop on error, only when finished
    }
    async onToolCallExecuted(executionEvent) {
        console.log(`[FileDatasetAgent ${this.datasetId}] Tool call executed: ${executionEvent.toolCall.name}`);
    }
}
class FileDatasetAgent {
    constructor(params) {
        this.fileId = params.fileId;
        this.instructions = params.instructions;
        this.sandbox = params.sandbox;
        this.service = new service_1.DatasetService();
        this.agentService = new story_2.AgentService();
    }
    async getDataset() {
        const internalAgent = new InternalFileDatasetAgent({
            fileId: this.fileId,
            instructions: this.instructions,
            sandbox: this.sandbox,
            service: this.service,
        });
        const datasetId = internalAgent.getDatasetId();
        const userEvent = {
            id: (0, admin_1.id)(),
            type: story_3.USER_MESSAGE_TYPE,
            channel: story_3.WEB_CHANNEL,
            content: {
                parts: [
                    {
                        type: "text",
                        text: "generate a dataset for this file",
                    },
                ],
            },
            createdAt: new Date().toISOString(),
        };
        const reaction = await internalAgent.progressStream(userEvent, null);
        const stream = reaction.stream;
        const streamResult = await this.agentService.readEventStream(stream);
        if (streamResult.persistedEvent?.status !== "completed") {
            throw new Error(`Dataset generation failed with status: ${streamResult.persistedEvent?.status}`);
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
        const internalAgent = new InternalFileDatasetAgent({
            fileId: this.fileId,
            instructions: this.instructions,
            sandbox: this.sandbox,
            service: this.service,
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
            throw new Error(`Dataset iteration failed with status: ${streamResult.persistedEvent?.status}`);
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
exports.FileDatasetAgent = FileDatasetAgent;
//# sourceMappingURL=file-dataset.agent.js.map