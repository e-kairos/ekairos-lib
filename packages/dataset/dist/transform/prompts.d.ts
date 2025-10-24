export type TransformPromptContext = {
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
        preview: {
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
    }>;
    errors: string[];
};
export declare function buildTransformDatasetPrompt(context: TransformPromptContext): string;
//# sourceMappingURL=prompts.d.ts.map