export * from './http/types.js';
export * from './http/errors.js';
export * from './http/interceptors.js';
export * from './http/refresh.js';
export * from './http/client.js';

// NOTE: This package is being built out incrementally.
// Next to implement (Frontend Architecture §3+):
//   - query/keys.ts         tenant-partitioned query key factory
//   - query/hooks/*         TanStack Query hooks per module
//   - mutations/useFinancialMutation.ts  idempotency + step-up MFA wrapper
