import { Sandbox } from "@vercel/sandbox";
export type FilePreviewContext = {
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
    tail?: {
        description: string;
        script: string;
        command: string;
        stdout: string;
        stderr: string;
    };
    mid?: {
        description: string;
        script: string;
        command: string;
        stdout: string;
        stderr: string;
    };
};
interface PreviewOptions {
    headLines?: number;
    tailLines?: number;
    midLines?: number;
}
export declare function ensurePreviewScriptsAvailable(sandbox: Sandbox): Promise<void>;
export declare function generateFilePreview(sandbox: Sandbox, sandboxFilePath: string, datasetId: string, options?: PreviewOptions): Promise<FilePreviewContext>;
export {};
//# sourceMappingURL=filepreview.d.ts.map