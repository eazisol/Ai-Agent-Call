export interface ObjectStoragePort {
  healthCheck(): Promise<void>;
}

export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
