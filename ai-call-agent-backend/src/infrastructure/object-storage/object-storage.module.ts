import { Module } from '@nestjs/common';
import { ObjectStorageHealthService } from './object-storage-health.service';
import { OBJECT_STORAGE_PORT } from './object-storage.port';

@Module({
  providers: [
    ObjectStorageHealthService,
    {
      provide: OBJECT_STORAGE_PORT,
      useExisting: ObjectStorageHealthService,
    },
  ],
  exports: [ObjectStorageHealthService, OBJECT_STORAGE_PORT],
})
export class ObjectStorageModule {}
