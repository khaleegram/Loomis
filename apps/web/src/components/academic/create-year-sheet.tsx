'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAcademicYear } from '@loomis/api-client';
import { createAcademicYearRequest, type CreateAcademicYearRequest } from '@loomis/contracts';
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

import { academicErrorMessage } from '@/lib/academic/academic-errors';

interface CreateYearSheetProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (yearId: string) => void;
}

export function CreateYearSheet({
  tenantId,
  open,
  onOpenChange,
  onCreated,
}: CreateYearSheetProps) {
  const createYear = useCreateAcademicYear(tenantId);

  const form = useForm<CreateAcademicYearRequest>({
    resolver: zodResolver(createAcademicYearRequest) as Resolver<CreateAcademicYearRequest>,
    defaultValues: {
      label: '',
      startDate: '',
      endDate: '',
      termCount: 3,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const year = await createYear.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onCreated?.(year.id);
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create academic year</SheetTitle>
          <SheetDescription>
            Define the school calendar period. Activation is a separate, irreversible step (US-ASM-001).
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year label</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="2025/2026" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="termCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of terms</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? 'term' : 'terms'}
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
            <SheetFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createYear.isPending}>
                {createYear.isPending ? 'Creating…' : 'Create draft year'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
