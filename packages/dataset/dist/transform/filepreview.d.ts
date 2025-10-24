import { Sandbox } from "@vercel/sandbox";
export type TransformSourcePreviewContext = {
    totalRows: number;
    metadata?: {
        description: string;
        script: string;
        command: string;
        stdout: string;
        stderr: string;
    };
    head?: {
        description: string;
        script: string;
        command: string;
        stdout: string;
        stderr: string;
    };
};
interface PreviewOptions {
    headLines?: number;
}
export declare function generateSourcePreview(sandbox: Sandbox, sourcePath: string, datasetId: string, options?: PreviewOptions): Promise<TransformSourcePreviewContext>;
export {};
//# sourceMappingURL=filepreview.d.ts.map