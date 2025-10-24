import { Sandbox } from "@vercel/sandbox";
import { DatasetService } from "./service";
interface ClearDatasetToolParams {
    service: DatasetService;
    datasetId: string;
    sandbox: Sandbox;
}
export declare function createClearDatasetTool({ service, datasetId, sandbox }: ClearDatasetToolParams): import("ai").Tool<{
    reason: string;
}, {
    success: boolean;
    error: string;
    deletedRecords?: undefined;
    message?: undefined;
} | {
    success: boolean;
    deletedRecords: number;
    message: string;
    error?: undefined;
}>;
export {};
//# sourceMappingURL=clearDataset.tool.d.ts.map