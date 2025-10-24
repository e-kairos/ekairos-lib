import { type StoryDescriptor } from "./storyEngine";
export declare function storyRunner(serialized: StoryDescriptor, args?: {
    context?: any;
}): Promise<{
    success: boolean;
    contextId: string;
}>;
//# sourceMappingURL=storyRunner.d.ts.map