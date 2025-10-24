export declare const datasetDomain: import("@ekairos/domain").DomainInstance<{
    readonly dataset_datasets: import("@instantdb/core").EntityDef<{
        status: import("@instantdb/core").DataAttrDef<string, false, true>;
        createdAt: import("@instantdb/core").DataAttrDef<number, false, true>;
        updatedAt: import("@instantdb/core").DataAttrDef<number, false, false>;
        title: import("@instantdb/core").DataAttrDef<string, false, false>;
        analysis: import("@instantdb/core").DataAttrDef<any, false, false>;
        schema: import("@instantdb/core").DataAttrDef<any, false, false>;
        calculatedTotalRows: import("@instantdb/core").DataAttrDef<number, false, false>;
        actualGeneratedRowCount: import("@instantdb/core").DataAttrDef<number, false, false>;
    }, {}, void>;
    readonly dataset_records: import("@instantdb/core").EntityDef<{
        rowContent: import("@instantdb/core").DataAttrDef<any, true, false>;
        order: import("@instantdb/core").DataAttrDef<number, true, true>;
        createdAt: import("@instantdb/core").DataAttrDef<number, true, false>;
    }, {}, void>;
    readonly $files: import("@instantdb/core").EntityDef<{
        id: import("@instantdb/core").DataAttrDef<string, true, true>;
        createdAt: import("@instantdb/core").DataAttrDef<number, true, true>;
        updatedAt: import("@instantdb/core").DataAttrDef<number, false, true>;
        name: import("@instantdb/core").DataAttrDef<string, false, false>;
        type: import("@instantdb/core").DataAttrDef<string, false, false>;
    }, {}, void>;
}, {
    readonly dataset_datasetsOrganization: {
        readonly forward: {
            readonly on: "dataset_datasets";
            readonly has: "one";
            readonly label: "organization";
        };
        readonly reverse: {
            readonly on: "organizations";
            readonly has: "many";
            readonly label: "dataset_datasets";
        };
    };
    readonly dataset_datasetsRecords: {
        readonly forward: {
            readonly on: "dataset_datasets";
            readonly has: "many";
            readonly label: "records";
        };
        readonly reverse: {
            readonly on: "dataset_records";
            readonly has: "one";
            readonly label: "dataset";
        };
    };
    readonly dataset_datasetsFiles: {
        readonly forward: {
            readonly on: "dataset_datasets";
            readonly has: "one";
            readonly label: "dataFile";
        };
        readonly reverse: {
            readonly on: "$files";
            readonly has: "many";
            readonly label: "datasets";
        };
    };
}, {}>;
//# sourceMappingURL=schema.d.ts.map