"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testStory = testStory;
async function testStory(storyId) {
    'use step';
    return {
        test: `Hello step, ${storyId}!`,
    };
}
//# sourceMappingURL=test-story-step.js.map