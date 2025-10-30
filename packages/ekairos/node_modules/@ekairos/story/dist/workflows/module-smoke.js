"use strict";
//import { moduleEchoStep } from '../steps/module-smoke'
Object.defineProperty(exports, "__esModule", { value: true });
exports.runModuleSmokeWorkflow = runModuleSmokeWorkflow;
const WORKFLOW_KEY = 'module:smoke';
async function runModuleSmokeWorkflow(input) {
    'use workflow';
    //const result = await moduleEchoStep(input.value)
    const result = {
        input: input.value,
        test: "233323",
        upper: input.value.toUpperCase(),
        timestamp: Date.now(),
    };
    return {
        ok: true,
        workflow: WORKFLOW_KEY,
        echo: result.input,
        upper: result.upper,
        test: result.test,
        timestamp: result.timestamp,
    };
}
//# sourceMappingURL=module-smoke.js.map