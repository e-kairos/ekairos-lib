export type RegisteredStep = (args: any) => Promise<any>;
export declare function registerStep(key: string, fn: RegisteredStep): void;
export declare function getRegisteredStep(key: string): RegisteredStep | undefined;
export declare function listRegisteredSteps(): string[];
//# sourceMappingURL=registry.d.ts.map