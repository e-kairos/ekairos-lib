import { Sandbox } from "@vercel/sandbox";
import { DatasetService } from "./service";
interface ExecuteCommandToolParams {
    service: DatasetService;
    datasetId: string;
    sandbox: Sandbox;
}
export declare function createExecuteCommandTool({ service, datasetId, sandbox }: ExecuteCommandToolParams): import("ai").Tool<{
    pythonCode: string;
    scriptName: string;
}, {
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    scriptPath: string;
    error: string;
    stdoutTruncated: boolean;
    stderrTruncated: boolean;
    stdoutOriginalLength: number;
    stderrOriginalLength: number;
    message?: undefined;
} | {
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    scriptPath: string;
    message: string;
    stdoutTruncated: boolean;
    stderrTruncated: boolean;
    stdoutOriginalLength: number;
    stderrOriginalLength: number;
    error?: undefined;
}>;
export {};
//# sourceMappingURL=executeCommand.tool.d.ts.map