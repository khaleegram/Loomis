import type { ReactNode } from 'react';

import { SchoolShell } from '@/components/school/school-shell';

/**
 * School console layout (Frontend Architecture §7.1).
 * Role-adaptive sidebar is client-rendered; this shell is static structure only.
 */
export default function SchoolLayout({ children }: { children: ReactNode }) {
  return <SchoolShell>{children}</SchoolShell>;
}
