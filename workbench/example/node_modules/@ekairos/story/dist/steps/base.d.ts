export declare function executeRegisteredStep(params: {
    implementationKey: string;
    contextId: string;
    args: any;
}): Promise<{
    success: boolean;
    result: any;
    message?: undefined;
} | {
    success: boolean;
    message: any;
    result?: undefined;
}>;
//# sourceMappingURL=base.d.ts.map