import { Module } from '@nestjs/common';
import { OBJECT_STORAGE_PORT } from './object-storage.port';
import { S3ObjectStorageAdapter } from './s3-object-storage.adapter';

@Module({
  providers: [
    S3ObjectStorageAdapter,
    {
      provide: OBJECT_STORAGE_PORT,
      useExisting: S3ObjectStorageAdapter,
    },
  ],
  exports: [S3ObjectStorageAdapter, OBJECT_STORAGE_PORT],
})
export class ObjectStorageModule {}
