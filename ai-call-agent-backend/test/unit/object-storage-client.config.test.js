const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildS3ClientConfig,
  isObjectStorageConfigured,
  resolveObjectStorageCredentialMode,
} = require('../../dist/infrastructure/object-storage/object-storage-client.config');

test('object storage disabled remains valid', () => {
  assert.equal(
    resolveObjectStorageCredentialMode({
      enabled: false,
      accessKeyId: 'key',
      secretAccessKey: '',
    }),
    'disabled',
  );
  assert.equal(
    isObjectStorageConfigured({
      enabled: false,
      bucket: 'bucket',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    }),
    false,
  );
});

test('explicit static credential pair resolves to static mode', () => {
  assert.equal(
    resolveObjectStorageCredentialMode({
      enabled: true,
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    }),
    'static',
  );

  const config = buildS3ClientConfig({
    region: 'us-east-1',
    endpoint: 'http://localhost:9000',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  });

  assert.equal(config.region, 'us-east-1');
  assert.equal(config.endpoint, 'http://localhost:9000');
  assert.equal(config.forcePathStyle, true);
  assert.deepEqual(config.credentials, {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  });
});

test('missing explicit credentials uses AWS default credential chain path', () => {
  assert.equal(
    resolveObjectStorageCredentialMode({
      enabled: true,
      accessKeyId: '',
      secretAccessKey: '',
    }),
    'iam',
  );

  const config = buildS3ClientConfig({
    region: 'eu-west-1',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
  });

  assert.equal(config.region, 'eu-west-1');
  assert.equal(config.endpoint, undefined);
  assert.equal(config.forcePathStyle, undefined);
  assert.equal(config.credentials, undefined);
});

test('native AWS config without custom endpoint is configured with bucket only', () => {
  assert.equal(
    isObjectStorageConfigured({
      enabled: true,
      bucket: 'eazi-production',
      region: 'us-east-1',
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
    }),
    true,
  );
});

test('custom endpoint preserves MinIO-style path-style configuration', () => {
  const config = buildS3ClientConfig({
    region: 'us-east-1',
    endpoint: 'http://minio:9000',
    accessKeyId: 'dev-key',
    secretAccessKey: 'dev-secret',
  });

  assert.equal(config.endpoint, 'http://minio:9000');
  assert.equal(config.forcePathStyle, true);
});

test('only access key fails credential validation', () => {
  assert.equal(
    resolveObjectStorageCredentialMode({
      enabled: true,
      accessKeyId: 'only-key',
      secretAccessKey: '',
    }),
    'invalid',
  );
  assert.equal(
    isObjectStorageConfigured({
      enabled: true,
      bucket: 'bucket',
      accessKeyId: 'only-key',
      secretAccessKey: '',
    }),
    false,
  );
  assert.throws(
    () =>
      buildS3ClientConfig({
        region: 'us-east-1',
        accessKeyId: 'only-key',
        secretAccessKey: '',
      }),
    /incomplete/i,
  );
});

test('only secret key fails credential validation', () => {
  assert.equal(
    resolveObjectStorageCredentialMode({
      enabled: true,
      accessKeyId: '',
      secretAccessKey: 'only-secret',
    }),
    'invalid',
  );
  assert.equal(
    isObjectStorageConfigured({
      enabled: true,
      bucket: 'bucket',
      accessKeyId: '',
      secretAccessKey: 'only-secret',
    }),
    false,
  );
});
