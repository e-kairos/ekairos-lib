import { AgentOptions } from "@ekairos/story";
import { Sandbox } from "@vercel/sandbox";
import { DatasetService } from "../service";
import { TransformSourcePreviewContext } from "./filepreview";
export type TransformDatasetContext = {
    datasetId: string;
    sourceDatasetIds: string[];
    outputSchema: any;
    sandboxConfig: {
        sourcePaths: Array<{
            datasetId: string;
            path: string;
        }>;
        outputPath: string;
    };
    sourcePreviews?: Array<{
        datasetId: string;
        preview: TransformSourcePreviewContext;
    }>;
    errors: string[];
    iterationCount: number;
    instructions?: string;
};
export type TransformDatasetAgentOptions = {
    sourceDatasetIds: string[];
    outputSchema: any;
    sandbox: Sandbox;
    service: DatasetService;
    instructions?: string;
} & AgentOptions;
export type TransformDatasetResult = {
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
export declare class TransformDatasetAgent {
    private sourceDatasetIds;
    private outputSchema;
    private sandbox;
    private service;
    private agentService;
    private instructions?;
    constructor(params: {
        sourceDatasetIds: string | string[];
        outputSchema: any;
        sandbox: Sandbox;
        instructions?: string;
    });
    getDataset(): Promise<TransformDatasetResult>;
    followUp(datasetId: string, feedback: string): Promise<TransformDatasetResult>;
}
//# sourceMappingURL=transform-dataset.agent.d.ts.map