import type { S3ClientConfig } from '@aws-sdk/client-s3';

export type ObjectStorageCredentialMode =
  | 'disabled'
  | 'static'
  | 'iam'
  | 'invalid';

export type ObjectStorageConfigInput = {
  enabled: boolean;
  bucket?: string | null;
  region?: string | null;
  endpoint?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
};

export function resolveObjectStorageCredentialMode(input: {
  enabled: boolean;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
}): ObjectStorageCredentialMode {
  if (!input.enabled) {
    return 'disabled';
  }

  const accessKeyId = input.accessKeyId?.trim() ?? '';
  const secretAccessKey = input.secretAccessKey?.trim() ?? '';

  if (accessKeyId && secretAccessKey) {
    return 'static';
  }

  if (!accessKeyId && !secretAccessKey) {
    return 'iam';
  }

  return 'invalid';
}

export function isObjectStorageConfigured(
  input: ObjectStorageConfigInput,
): boolean {
  if (!input.enabled) {
    return false;
  }

  if (!input.bucket?.trim()) {
    return false;
  }

  return resolveObjectStorageCredentialMode(input) !== 'invalid';
}

export function buildS3ClientConfig(
  input: Pick<
    ObjectStorageConfigInput,
    'region' | 'endpoint' | 'accessKeyId' | 'secretAccessKey'
  >,
): S3ClientConfig {
  const mode = resolveObjectStorageCredentialMode({
    enabled: true,
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
  });

  if (mode === 'invalid') {
    throw new Error(
      'Object storage static credentials are incomplete: provide both OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_SECRET_ACCESS_KEY, or omit both to use the AWS default credential chain.',
    );
  }

  const endpoint = input.endpoint?.trim() || undefined;
  const region = input.region?.trim() || 'us-east-1';

  const config: S3ClientConfig = { region };

  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true;
  }

  if (mode === 'static') {
    config.credentials = {
      accessKeyId: input.accessKeyId!.trim(),
      secretAccessKey: input.secretAccessKey!.trim(),
    };
  }

  return config;
}
