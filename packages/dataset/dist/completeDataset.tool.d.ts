import { Sandbox } from "@vercel/sandbox";
import { DatasetService } from "./service";
interface CompleteDatasetToolParams {
    service: DatasetService;
    datasetId: string;
    sandbox: Sandbox;
}
export declare function createCompleteDatasetTool({ service, datasetId, sandbox }: CompleteDatasetToolParams): import("ai").Tool<{
    summary: string;
}, {
    success: boolean;
    validation?: Array<{
        index: number;
        valid: boolean;
        errors?: string[];
    }>;
    validRowCount?: number;
    error?: string;
} | {
    success: boolean;
    validRows: number | undefined;
    fileId: string;
    storagePath: string;
    message: string;
}>;
export {};
//# sourceMappingURL=completeDataset.tool.d.ts.map