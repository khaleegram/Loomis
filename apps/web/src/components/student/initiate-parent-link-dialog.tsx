'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useInitiateParentLink } from '@loomis/api-client';
import { initiateParentLinkRequest, type InitiateParentLinkRequest } from '@loomis/contracts';
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@loomis/ui-web';
import { useForm, type Resolver } from 'react-hook-form';

import { relationshipLabel } from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

interface InitiateParentLinkDialogProps {
  tenantId: string;
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInitiated?: () => void;
}

export function InitiateParentLinkDialog({
  tenantId,
  studentId,
  studentName,
  open,
  onOpenChange,
  onInitiated,
}: InitiateParentLinkDialogProps) {
  const initiate = useInitiateParentLink(tenantId, studentId);

  const form = useForm<InitiateParentLinkRequest>({
    resolver: zodResolver(initiateParentLinkRequest) as Resolver<InitiateParentLinkRequest>,
    defaultValues: {
      parentFullName: '',
      parentEmail: '',
      parentPhone: '',
      relationship: 'guardian',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await initiate.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onInitiated?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Initiate parent link</DialogTitle>
          <DialogDescription>
            Send an OTP invitation to link a parent to {studentName} (US-SIS-004).
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertTitle>Parent must verify</AlertTitle>
          <AlertDescription>
            An OTP is sent to the parent&apos;s email. You cannot complete verification on their
            behalf. Links expire after 48 hours if not accepted.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="parentFullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to student</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['mother', 'father', 'guardian', 'sponsor', 'other'] as const).map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {relationshipLabel(r)}
                          </SelectItem>
                        ),
                      )}
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
              <Button type="submit" disabled={initiate.isSubmitting}>
                {initiate.isSubmitting ? 'Sending…' : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
