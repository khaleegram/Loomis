'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRecordIdentityAttestation } from '@loomis/api-client';
import {
  recordIdentityAttestationRequest,
  type IdentityAttestationType,
  type RecordIdentityAttestationRequest,
} from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@loomis/ui-web';
import { useForm, type Resolver } from 'react-hook-form';

import { attestationTypeLabel } from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

const ATTESTATION_TYPES = [
  'birth_certificate',
  'previous_school_record',
  'admission_photograph',
  'parent_consent',
] as const satisfies readonly IdentityAttestationType[];

interface RecordAttestationDialogProps {
  tenantId: string;
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}

export function RecordAttestationDialog({
  tenantId,
  studentId,
  open,
  onOpenChange,
  onRecorded,
}: RecordAttestationDialogProps) {
  const record = useRecordIdentityAttestation(tenantId, studentId);

  const form = useForm<RecordIdentityAttestationRequest>({
    resolver: zodResolver(recordIdentityAttestationRequest) as Resolver<RecordIdentityAttestationRequest>,
    defaultValues: {
      attestationType: 'birth_certificate',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await record.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onRecorded?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record identity attestation</DialogTitle>
          <DialogDescription>
            At least one attestation must be on file before billable enrollment (FR-SIS-002).
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertTitle>Compliance requirement</AlertTitle>
          <AlertDescription>
            This attestation is recorded in the audit trail and cannot be removed once submitted.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="attestationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attestation type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ATTESTATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {attestationTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={record.isPending}>
                {record.isPending ? 'Recording…' : 'Record attestation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
