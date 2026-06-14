'use client';

import type { ReactNode } from 'react';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';

interface GradebookWorkspaceProps {
  toolbar: ReactNode;
  statusBar: ReactNode;
  children: ReactNode;
}

/** Full-height digital gradebook shell — spreadsheet workspace, not a dashboard. */
export function GradebookWorkspace({ toolbar, statusBar, children }: GradebookWorkspaceProps) {
  return (
    <div className={GRADEBOOK_UI.frame}>
      <div className={GRADEBOOK_UI.toolbar}>{toolbar}</div>
      <div className={GRADEBOOK_UI.gridViewport}>{children}</div>
      <div className={GRADEBOOK_UI.statusBar}>{statusBar}</div>
    </div>
  );
}
