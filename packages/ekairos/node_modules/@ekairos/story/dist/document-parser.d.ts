export interface DocumentToProcess {
    buffer: Buffer;
    fileName: string;
    path: string;
    fileId: string;
}
/**
 * Procesa un documento utilizando LlamaParse y almacena el resultado en la base de datos
 */
export declare function parseAndStoreDocument(db: any, buffer: Buffer, fileName: string, path: string, fileId: string): Promise<string>;
/**
 * Procesa un conjunto de documentos en segundo plano
 * Puede ser utilizado con after() en Next.js o en cualquier contexto de procesamiento asíncrono
 */
export declare function processBatchDocuments(db: any, documents: DocumentToProcess[]): Promise<string[]>;
//# sourceMappingURL=document-parser.d.ts.map