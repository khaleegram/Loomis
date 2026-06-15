'use client';

import { Settings } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

export function SettingsSectionHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-8" style={{ background: SURFACES.hero }}>
        <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Settings aria-hidden className="size-4" />
          </span>
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>School settings</p>
            <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Settings
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Personalise your Loomis experience and manage account security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
