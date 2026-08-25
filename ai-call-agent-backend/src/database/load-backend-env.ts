import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * Load backend env files for CLI scripts (migrations/bootstrap).
 * Nest ConfigModule does this at runtime; TypeORM CLI does not.
 */
export function loadBackendEnv(): void {
  const cwd = process.cwd();
  const candidates = ['.env.local', '.env', '.env.docker'];
  for (const file of candidates) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) {
      continue;
    }
    loadDotenv({ path, override: false });
  }
}

export function formatPgError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const parts = [error.message || error.name || 'Unknown error'];
  const withCode = error as Error & {
    code?: string;
    errno?: string | number;
    address?: string;
    port?: number;
    cause?: unknown;
  };

  if (withCode.code) {
    parts.push(`code=${withCode.code}`);
  }
  if (withCode.errno !== undefined) {
    parts.push(`errno=${withCode.errno}`);
  }
  if (withCode.address || withCode.port) {
    parts.push(`target=${withCode.address ?? ''}:${withCode.port ?? ''}`);
  }
  if (withCode.cause instanceof Error && withCode.cause.message) {
    parts.push(`cause=${withCode.cause.message}`);
  }

  // AggregateError / empty message on Windows connection refused
  if (!error.message && 'errors' in error && Array.isArray((error as AggregateError).errors)) {
    const nested = (error as AggregateError).errors
      .map((item) => formatPgError(item))
      .join('; ');
    if (nested) {
      parts.push(nested);
    }
  }

  try {
    const sample = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    if (!sample.includes('DATABASE_')) {
      parts.push('hint=.env may be missing DATABASE_* keys');
    }
  } catch {
    parts.push('hint=ensure .env is loaded (DATABASE_HOST/PORT)');
  }

  return parts.filter(Boolean).join(' | ');
}
