/**
 * Driver selection (#1433). In-memory is the default; S3 activates only when
 * the environment contract is fully satisfied.
 */

import { InMemoryStorageDriver } from './in-memory-driver';
import { readS3Config, type EnvLike } from './env-config';
import { S3StorageDriver } from './s3-driver';
import type { StorageDriver } from './driver';

export * from './driver';
export * from './env-config';
export { InMemoryStorageDriver } from './in-memory-driver';
export { S3StorageDriver } from './s3-driver';

export interface DriverSelection {
  driver: StorageDriver;
  /** Why the in-memory driver was chosen, when S3 was asked for but unusable. */
  fallbackReason?: string;
}

export function selectStorageDriver(env: EnvLike = process.env): DriverSelection {
  const result = readS3Config(env);
  if (result.enabled) {
    return { driver: new S3StorageDriver({ config: result.config }) };
  }
  return {
    driver: new InMemoryStorageDriver(),
    fallbackReason: 'missing' in result ? `${result.reason}: ${result.missing.join(', ')}` : result.reason,
  };
}
