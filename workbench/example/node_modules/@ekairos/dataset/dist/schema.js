"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.datasetDomain = void 0;
const core_1 = require("@instantdb/core");
const domain_1 = require("@ekairos/domain");
const entities = {
    dataset_datasets: core_1.i.entity({
        status: core_1.i.string().optional().indexed(),
        createdAt: core_1.i.number().optional().indexed(),
        updatedAt: core_1.i.number().optional(),
        title: core_1.i.string().optional(),
        analysis: core_1.i.json().optional(),
        schema: core_1.i.json().optional(),
        calculatedTotalRows: core_1.i.number().optional(),
        actualGeneratedRowCount: core_1.i.number().optional(),
    }),
    dataset_records: core_1.i.entity({
        rowContent: core_1.i.json(),
        order: core_1.i.number().indexed(),
        createdAt: core_1.i.number(),
    }),
    $files: core_1.i.entity({
        id: core_1.i.string().indexed(),
        createdAt: core_1.i.number().indexed(),
        updatedAt: core_1.i.number().optional().indexed(),
        name: core_1.i.string().optional(),
        type: core_1.i.string().optional(),
    }),
};
const links = {
    dataset_datasetsOrganization: {
        forward: { on: "dataset_datasets", has: "one", label: "organization" },
        reverse: { on: "organizations", has: "many", label: "dataset_datasets" },
    },
    dataset_datasetsRecords: {
        forward: { on: "dataset_datasets", has: "many", label: "records" },
        reverse: { on: "dataset_records", has: "one", label: "dataset" },
    },
    dataset_datasetsFiles: {
        forward: { on: "dataset_datasets", has: "one", label: "dataFile" },
        reverse: { on: "$files", has: "many", label: "datasets" },
    },
};
const rooms = {};
exports.datasetDomain = (0, domain_1.domain)({ entities, links, rooms });
//# sourceMappingURL=schema.js.map