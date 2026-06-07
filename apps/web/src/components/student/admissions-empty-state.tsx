import { Button, Card, CardContent } from '@loomis/ui-web';
import { ClipboardList } from 'lucide-react';

interface AdmissionsEmptyStateProps {
  canCreate: boolean;
  onCreateClick: () => void;
}

export function AdmissionsEmptyState({ canCreate, onCreateClick }: AdmissionsEmptyStateProps) {
  return (
    <Card className="border-dashed border-border shadow-none">
      <CardContent className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-forest-800 dark:text-mint-400">
          <ClipboardList className="size-7" aria-hidden />
        </div>
        <h2 className="font-serif text-lg font-semibold text-foreground">No applications yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Register your first applicant to begin the admissions pipeline. Each application receives
          a reference number and appears here for review (US-SIS-001).
        </p>
        {canCreate ? (
          <Button className="mt-6" onClick={onCreateClick}>
            Register first applicant
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
