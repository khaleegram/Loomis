'use client';

import type { ReactNode } from 'react';

import { ParentLayoutGate } from '@/components/parent/parent-shell';

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <ParentLayoutGate>{children}</ParentLayoutGate>;
}
