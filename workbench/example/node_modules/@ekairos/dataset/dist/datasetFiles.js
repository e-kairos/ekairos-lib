"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATASET_OUTPUT_FILE_NAME = void 0;
exports.getDatasetWorkstation = getDatasetWorkstation;
exports.getDatasetOutputPath = getDatasetOutputPath;
exports.DATASET_OUTPUT_FILE_NAME = "output.jsonl";
function getDatasetWorkstation(datasetId) {
    return `/vercel/sandbox/datasets/${datasetId}`;
}
function getDatasetOutputPath(datasetId) {
    return `${getDatasetWorkstation(datasetId)}/${exports.DATASET_OUTPUT_FILE_NAME}`;
}
//# sourceMappingURL=datasetFiles.js.map