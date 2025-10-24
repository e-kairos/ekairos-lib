export type ServiceResult<T = any> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
};
export declare class DatasetService {
    private readonly db;
    constructor();
    createDataset(params: {
        id?: string;
        sources?: string;
        instructions?: string;
        status?: string;
        organizationId?: string;
        [key: string]: any;
    }): Promise<ServiceResult<{
        datasetId: string;
    }>>;
    updateDataset(datasetId: string, updates: Record<string, any>): Promise<ServiceResult<void>>;
    addDatasetRecords(params: {
        datasetId: string;
        records: Array<{
            rowContent: any;
            order: number;
        }>;
    }): Promise<ServiceResult<{
        savedCount: number;
    }>>;
    batchAddDatasetRecords(params: {
        datasetId: string;
        shardMutations: any[];
        manifestMetadata?: any;
    }): Promise<ServiceResult<void>>;
    findDatasetByFileId(fileId: string): Promise<any | null>;
    findDatasetRecords(datasetId: string): Promise<any[]>;
    getFileById(fileId: string): Promise<any>;
    getDatasetById(datasetId: string): Promise<ServiceResult<any>>;
    updateDatasetSchema(params: {
        datasetId: string;
        schema: any;
        status?: string;
    }): Promise<ServiceResult<void>>;
    updateDatasetStatus(params: {
        datasetId: string;
        status: string;
        calculatedTotalRows?: number;
        actualGeneratedRowCount?: number;
    }): Promise<ServiceResult<void>>;
    getDatasetRecordsForDeletion(datasetId: string): Promise<ServiceResult<Array<{
        id: string;
    }>>>;
    deleteDatasetRecordsBatch(recordIds: string[]): Promise<ServiceResult<number>>;
    clearDataset(datasetId: string): Promise<ServiceResult<{
        deletedCount: number;
    }>>;
    uploadDatasetOutputFile(params: {
        datasetId: string;
        fileBuffer: Buffer;
    }): Promise<ServiceResult<{
        fileId: string;
        storagePath: string;
    }>>;
    linkFileToDataset(params: {
        datasetId: string;
        fileId: string;
        storagePath: string;
    }): Promise<ServiceResult<void>>;
    readRecordsFromFile(datasetId: string): Promise<ServiceResult<AsyncGenerator<any, void, unknown>>>;
    getContextByDatasetId(datasetId: string): Promise<ServiceResult<any>>;
}
//# sourceMappingURL=service.d.ts.map