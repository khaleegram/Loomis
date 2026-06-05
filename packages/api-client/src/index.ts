export * from './http/types.js';
export * from './http/errors.js';

// NOTE: This package is being built out incrementally.
// Next to implement (Frontend Architecture §3):
//   - http/client.ts        low-level fetch wrapper using injected adapters
//   - http/interceptors.ts  auth / tenant / request-id / idempotency headers
//   - http/refresh.ts       single-flight refresh-token rotation
//   - query/keys.ts         tenant-partitioned query key factory
//   - query/hooks/*         TanStack Query hooks per module
//   - mutations/useFinancialMutation.ts  idempotency + step-up MFA wrapper
