'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@loomis/ui-web';

interface StudentQuickActionPanelProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Lightweight quick-action panel for the student directory.
 * Full enrollment/parent link/attestation dialogs live on the profile page.
 */
export function StudentQuickActionPanel({
  studentId,
}: StudentQuickActionPanelProps) {
  if (!studentId) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-brand-200 text-brand-700 hover:bg-brand-50"
      asChild
    >
      <Link href={`/school/students/${studentId}`}>
        <ExternalLink aria-hidden className="size-3.5" />
        Open profile
      </Link>
    </Button>
  );
}
