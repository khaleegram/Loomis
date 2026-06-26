'use client';

import { useEffect, useState } from 'react';
import { useAcademicSetupPreferences, useUpsertAcademicSetupPreferences } from '@loomis/api-client';
import { FileText } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  DEFAULT_REPORT_CARD_PREFERENCES,
  type ReportCardPreferences,
} from '@/lib/academic/report-card-preferences';

interface ReportCardSetupPanelProps {
  tenantId: string;
  onSaved?: () => void;
}

const FIELDS: { key: keyof ReportCardPreferences; label: string; hint: string }[] = [
  { key: 'showScores', label: 'Subject scores', hint: 'CA, Exam, and Total per subject' },
  { key: 'showGrade', label: 'Letter grade', hint: 'A, B, C, etc.' },
  { key: 'showPosition', label: 'Class position', hint: '1st, 2nd, 3rd in class' },
  { key: 'showAttendance', label: 'Attendance summary', hint: 'Days present / absent' },
  { key: 'showTeacherComment', label: 'Class teacher comment', hint: 'Remarks from class teacher' },
  { key: 'showPrincipalComment', label: 'Principal comment', hint: 'Head of school remarks' },
  { key: 'useSchoolLogo', label: 'School logo', hint: 'From your school branding settings' },
];

/** One-time question: what appears on the report card parents download. */
export function ReportCardSetupPanel({ tenantId, onSaved }: ReportCardSetupPanelProps) {
  const preferencesQuery = useAcademicSetupPreferences(tenantId);
  const upsertPreferences = useUpsertAcademicSetupPreferences(tenantId);
  const [prefs, setPrefs] = useState<ReportCardPreferences>(() =>
    preferencesQuery.data?.reportCards ?? DEFAULT_REPORT_CARD_PREFERENCES,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (preferencesQuery.data?.reportCards) {
      setPrefs(preferencesQuery.data.reportCards);
    }
  }, [preferencesQuery.data]);

  function toggle(key: keyof ReportCardPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  async function handleSave() {
    await upsertPreferences.mutateAsync({ reportCards: prefs });
    setSaved(true);
    onSaved?.();
  }

  return (
    <div className="card space-y-4 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <FileText aria-hidden className="size-5" />
        </span>
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Report card setup</p>
          <h2 className="mt-1 text-[15px] font-bold text-neutral-900">
            What should parents see on the report card?
          </h2>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            Generated automatically after results are published. Toggle what to include.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
        {FIELDS.map((field) => (
          <li key={field.key}>
            <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-neutral-900">{field.label}</p>
                <p className="text-[11px] text-neutral-400">{field.hint}</p>
              </div>
              <input
                type="checkbox"
                checked={prefs[field.key]}
                onChange={() => toggle(field.key)}
                className="size-5 rounded border-neutral-300"
              />
            </label>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setPrefs(DEFAULT_REPORT_CARD_PREFERENCES)} className="text-[12px] font-semibold text-neutral-400 hover:text-neutral-600">
          Reset to defaults
        </button>
        <button
          type="button"
          disabled={upsertPreferences.isPending}
          onClick={() => void handleSave()}
          className={cn(ACADEMIC_UI.btnPrimarySm)}
        >
          {upsertPreferences.isPending ? 'Saving…' : saved ? 'Saved' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
