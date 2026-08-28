export interface ObjectStoragePort {
  healthCheck(): Promise<void>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
}

export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
