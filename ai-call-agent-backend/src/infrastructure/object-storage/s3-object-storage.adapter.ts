import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../common/errors/application-error';
import type { ObjectStoragePort } from './object-storage.port';

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly logger = new Logger(S3ObjectStorageAdapter.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<boolean>('objectStorage.enabled'));
  }

  isConfigured(): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    const bucket = this.config.get<string>('objectStorage.bucket');
    const accessKeyId = this.config.get<string>('objectStorage.accessKeyId');
    const secretAccessKey = this.config.get<string>(
      'objectStorage.secretAccessKey',
    );
    return Boolean(bucket && accessKeyId && secretAccessKey);
  }

  async healthCheck(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (!this.isConfigured()) {
      throw new Error(
        'Object storage is enabled but credentials are incomplete',
      );
    }

    const timeout =
      this.config.get<number>('objectStorage.healthTimeoutMs') ?? 2000;
    const bucket = this.config.getOrThrow<string>('objectStorage.bucket');
    const client = this.getClient();

    await Promise.race([
      client.send(new HeadBucketCommand({ Bucket: bucket })),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Object storage health check timed out')),
          timeout,
        );
      }),
    ]);
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    this.requireConfigured();
    const bucket = this.config.getOrThrow<string>('objectStorage.bucket');
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<Buffer> {
    this.requireConfigured();
    const bucket = this.config.getOrThrow<string>('objectStorage.bucket');
    const response = await this.getClient().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const body = response.Body;
    if (!body) {
      throw new ApplicationError(
        'OBJECT_STORAGE_NOT_CONFIGURED',
        'Object storage returned an empty body.',
        502,
      );
    }
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `Skipping object delete for ${key}: object storage not configured`,
      );
      return;
    }
    const bucket = this.config.getOrThrow<string>('objectStorage.bucket');
    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Best-effort object delete failed for ${key}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ApplicationError(
        'OBJECT_STORAGE_NOT_CONFIGURED',
        'Object storage is not configured. File uploads are unavailable.',
        503,
      );
    }
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const region =
      this.config.get<string>('objectStorage.region') ?? 'us-east-1';
    const endpoint = this.config.get<string>('objectStorage.endpoint');
    const accessKeyId = this.config.getOrThrow<string>(
      'objectStorage.accessKeyId',
    );
    const secretAccessKey = this.config.getOrThrow<string>(
      'objectStorage.secretAccessKey',
    );

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.client;
  }
}
