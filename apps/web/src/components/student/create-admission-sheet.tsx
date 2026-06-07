'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAdmission, useClassLevels } from '@loomis/api-client';
import { createAdmissionRequest, type AdmissionResponse, type CreateAdmissionRequest } from '@loomis/contracts';
import {
  Button,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@loomis/ui-web';
import { useForm, type Resolver } from 'react-hook-form';

import { genderLabel, relationshipLabel } from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

interface CreateAdmissionSheetProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (admission: AdmissionResponse) => void;
}

export function CreateAdmissionSheet({
  tenantId,
  open,
  onOpenChange,
  onCreated,
}: CreateAdmissionSheetProps) {
  const createAdmission = useCreateAdmission(tenantId);
  const classLevelsQuery = useClassLevels(tenantId);
  const levels = classLevelsQuery.data?.levels ?? [];

  const form = useForm<CreateAdmissionRequest>({
    resolver: zodResolver(createAdmissionRequest) as Resolver<CreateAdmissionRequest>,
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'unknown',
      intendedClassLevelId: '',
      guardianName: '',
      guardianEmail: '',
      guardianPhone: '',
      guardianRelationship: 'guardian',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const admission = await createAdmission.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onCreated?.(admission);
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Register new applicant</SheetTitle>
          <SheetDescription>
            Capture student and guardian details. A reference number is generated on submission
            (US-SIS-001).
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="mt-6 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Student
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of birth</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(['male', 'female', 'other', 'unknown'] as const).map((g) => (
                            <SelectItem key={g} value={g}>
                              {genderLabel(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="intendedClassLevelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intended class level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name} ({level.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Guardian
              </p>
              <FormField
                control={form.control}
                name="guardianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="guardianEmail"
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
                  name="guardianPhone"
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
              </div>
              <FormField
                control={form.control}
                name="guardianRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
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
            </div>

            {form.formState.errors.root ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAdmission.isPending}>
                {createAdmission.isPending ? 'Submitting…' : 'Submit application'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
