'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransferStudentOut } from '@loomis/api-client';
import { transferStudentOutRequest, type TransferStudentOutRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
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
  Input,
  Textarea,
} from '@loomis/ui-web';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { studentErrorMessage } from '@/lib/student/student-errors';

const transferFormSchema = transferStudentOutRequest.extend({
  acknowledged: z.boolean().refine((v) => v, {
    message: 'Confirm you understand this ends enrollment at this school',
  }),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface TransferStudentDialogProps {
  tenantId: string;
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferred?: () => void;
}

export function TransferStudentDialog({
  tenantId,
  studentId,
  studentName,
  open,
  onOpenChange,
  onTransferred,
}: TransferStudentDialogProps) {
  const transfer = useTransferStudentOut(tenantId, studentId);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema) as Resolver<TransferFormValues>,
    defaultValues: {
      destinationSchool: '',
      reason: '',
      acknowledged: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const body: TransferStudentOutRequest = {
      destinationSchool: values.destinationSchool,
      reason: values.reason,
    };
    try {
      await transfer.mutateAsync(body);
      form.reset();
      onOpenChange(false);
      onTransferred?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process transfer out</DialogTitle>
          <DialogDescription>
            End {studentName}&apos;s enrollment and generate a transfer certificate (US-SIS-006).
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Irreversible action</AlertTitle>
          <AlertDescription>
            This removes the student from future term enrollments and ends active class placements.
            A transfer certificate will be generated on approval.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="destinationSchool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination school</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="School name or Unknown" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for transfer</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Document the reason…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acknowledged"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I understand this formally ends enrollment at this school
                    </FormLabel>
                    <FormMessage />
                  </div>
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
              <Button type="submit" variant="destructive" disabled={transfer.isSubmitting}>
                {transfer.isSubmitting ? 'Processing…' : 'Submit transfer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
