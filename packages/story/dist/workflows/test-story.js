"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestStory = runTestStory;
const test_story_step_1 = require("./test-story-step");
async function runTestStory(storyId) {
    'use workflow';
    const result = await (0, test_story_step_1.testStory)(storyId);
    return {
        contextId: `story-${storyId}`,
        status: 'completed',
        ...result
    };
}
//# sourceMappingURL=test-story.js.map