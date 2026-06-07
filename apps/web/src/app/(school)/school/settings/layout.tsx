'use client';

import type { ReactNode } from 'react';

import { SettingsSubNav } from '@/components/settings/settings-sub-nav';
import { PageBody, PageHeader } from '@/components/school/school-shell';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Personalise your Loomis experience and manage account security."
      />
      <PageBody>
        <SettingsSubNav />
        {children}
      </PageBody>
    </>
  );
}
