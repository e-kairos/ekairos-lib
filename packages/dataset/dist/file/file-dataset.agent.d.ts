import { AgentOptions } from "@ekairos/story";
import { Sandbox } from "@vercel/sandbox";
import { FilePreviewContext } from "./filepreview";
import { DatasetService } from "../service";
export type FileDatasetContext = {
    datasetId: string;
    fileId: string;
    instructions: string;
    sandboxConfig: {
        filePath: string;
    };
    analysis: any[];
    schema: any | null;
    plan: any | null;
    executionResult: any | null;
    errors: string[];
    iterationCount: number;
    filePreview?: FilePreviewContext;
};
export type FileDatasetAgentOptions = {
    fileId: string;
    instructions: string;
    sandbox: Sandbox;
    service: DatasetService;
} & AgentOptions;
export type DatasetResult = {
    id: string;
    status?: string;
    title?: string;
    schema?: any;
    analysis?: any;
    calculatedTotalRows?: number;
    actualGeneratedRowCount?: number;
    createdAt?: number;
    updatedAt?: number;
};
export declare class FileDatasetAgent {
    private fileId;
    private instructions;
    private sandbox;
    private service;
    private agentService;
    constructor(params: {
        fileId: string;
        instructions: string;
        sandbox: Sandbox;
    });
    getDataset(): Promise<DatasetResult>;
    followUp(datasetId: string, feedback: string): Promise<DatasetResult>;
}
//# sourceMappingURL=file-dataset.agent.d.ts.map