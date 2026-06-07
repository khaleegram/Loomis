import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FINANCE_SERVICES_DIR = join(import.meta.dirname, 'services');

const FINANCE_WRITE_SERVICES = [
  'fee-structure.service.ts',
  'invoice.service.ts',
  'payment.service.ts',
  'refund.service.ts',
  'reconciliation.service.ts',
];

describe('finance audit coverage', () => {
  it('every financial write service calls assertAuditAvailable before mutating', () => {
    for (const file of FINANCE_WRITE_SERVICES) {
      const source = readFileSync(join(FINANCE_SERVICES_DIR, file), 'utf8');
      expect(source, `${file} must gate on assertAuditAvailable`).toContain(
        'assertAuditAvailable',
      );
      expect(source, `${file} must append writeFinanceAudit`).toContain('writeFinanceAudit');
    }
  });

  it('financial write routes include requireAuditAvailable middleware', () => {
    const routesDir = join(import.meta.dirname, 'routes');
    const routeFiles = readdirSync(routesDir).filter((f) => f.endsWith('.routes.ts'));

    let writeRouteCount = 0;
    for (const file of routeFiles) {
      const source = readFileSync(join(routesDir, file), 'utf8');
      if (!source.includes("app.post") && !source.includes("app.put") && !source.includes("app.patch")) {
        continue;
      }
      if (source.includes('requireIdempotencyKey') || source.includes("'/reconciliation/run'")) {
        expect(source, `${file} write routes`).toContain('requireAuditAvailable');
        writeRouteCount += 1;
      }
    }
    expect(writeRouteCount).toBeGreaterThan(0);
  });
});
