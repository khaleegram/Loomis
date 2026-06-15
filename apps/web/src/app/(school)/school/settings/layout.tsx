'use client';

import type { ReactNode } from 'react';

import { SettingsSubNav } from '@/components/settings/settings-sub-nav';
import { SettingsSectionHeader } from '@/components/settings/settings-section-header';
import { PageBody } from '@/components/school/school-shell';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <div className="space-y-6">
        <SettingsSectionHeader />
        <SettingsSubNav />
        {children}
      </div>
    </PageBody>
  );
}
