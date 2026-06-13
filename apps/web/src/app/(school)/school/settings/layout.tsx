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
      <PageBody className="px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <SettingsSubNav />
        {children}
      </PageBody>
    </>
  );
}
