import { Sandbox } from "@vercel/sandbox";
import { DatasetService } from "../service";
interface GenerateSchemaToolParams {
    service: DatasetService;
    datasetId: string;
    sandbox?: Sandbox;
    isNested?: boolean;
    fileId?: string;
}
export declare function createGenerateSchemaTool({ service, datasetId, sandbox, isNested, fileId }: GenerateSchemaToolParams): import("ai").Tool<{
    schemaTitle: string;
    schemaDescription: string;
    schemaJson: string;
}, {
    success: boolean;
    error: string;
    schema?: undefined;
    message?: undefined;
} | {
    success: boolean;
    schema: {
        title: string;
        description: string;
        schema: any;
        generatedAt: string;
    };
    message: string;
    error?: undefined;
}>;
export {};
//# sourceMappingURL=generateSchema.tool.d.ts.map