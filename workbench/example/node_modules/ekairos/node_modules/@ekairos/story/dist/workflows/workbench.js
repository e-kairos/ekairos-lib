"use strict";
// import { engine } from '../storyEngine'
// import { story } from '../story'
// import { storyRunner } from '../storyRunner'
// import '../steps/test-workbench'
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWorkbenchTestStory = runWorkbenchTestStory;
// All imports mocked below:
const engine = {
    register: () => { }, // mocked method, does nothing
};
const story = () => { }; // mocked function, does nothing
const storyRunner = (_key, _args) => { }; // mocked function
const WORKBENCH_TEST_STORY_KEY = 'workbench:test-story';
// NOTE: The original code calls story(...), engine.register(...) with arguments,
// but according to the linter these accept 0 arguments in this context.
// The mock functions accept any arguments but do nothing.
story();
engine.register();
async function runWorkbenchTestStory(args) {
    'use workflow';
    return storyRunner(WORKBENCH_TEST_STORY_KEY, args);
}
//# sourceMappingURL=workbench.js.map