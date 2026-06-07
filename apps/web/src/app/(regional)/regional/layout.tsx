import type { ReactNode } from 'react';

import { RegionalShell } from '@/components/regional/regional-shell';

export default function RegionalLayout({ children }: { children: ReactNode }) {
  return <RegionalShell>{children}</RegionalShell>;
}
