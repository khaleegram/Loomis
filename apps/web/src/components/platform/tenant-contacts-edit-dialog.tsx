'use client';

import { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  nigerianMobilePhone,
  tenantContactRole,
  updateTenantContactsRequest,
} from '@loomis/contracts';
import type { TenantContactInput, TenantResponse } from '@loomis/contracts';
import { useUpdateTenantContacts } from '@loomis/api-client';
import {
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
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const ROLE_LABELS: Record<z.infer<typeof tenantContactRole>, string> = {
  primary: 'Primary',
  billing: 'Billing',
  operations: 'Operations',
  proprietor: 'Proprietor',
};

const contactRowSchema = z.object({
  role: tenantContactRole,
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  phone: nigerianMobilePhone.optional().or(z.literal('')),
  isPrimary: z.boolean(),
});

const formSchema = z
  .object({
    contacts: z.array(contactRowSchema).min(1).max(10),
  })
  .superRefine((data, ctx) => {
    const primaryCount = data.contacts.filter((c) => c.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Exactly one contact must be marked primary',
        path: ['contacts'],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const inputClass =
  'h-10 rounded-lg border-neutral-200 bg-white text-[13px] text-neutral-900 placeholder:text-neutral-400';

function toFormContacts(tenant: TenantResponse): FormValues['contacts'] {
  if (tenant.contacts.length > 0) {
    return tenant.contacts.map((c) => ({
      role: c.role,
      fullName: c.fullName ?? tenant.name,
      email: c.email,
      phone: c.phone ?? '',
      isPrimary: c.isPrimary ?? false,
    }));
  }
  return [
    {
      role: 'primary' as const,
      fullName: tenant.name,
      email: tenant.contactEmail,
      phone: tenant.contactPhone ?? '',
      isPrimary: true,
    },
  ];
}

interface TenantContactsEditDialogProps {
  tenant: TenantResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantContactsEditDialog({
  tenant,
  open,
  onOpenChange,
}: TenantContactsEditDialogProps) {
  const updateContacts = useUpdateTenantContacts(tenant.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { contacts: toFormContacts(tenant) },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'contacts' });
  const watchedContacts = useWatch({ control: form.control, name: 'contacts' }) ?? [];

  /** Reset only when the dialog opens — not on every parent re-render of `tenant`. */
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    form.reset({ contacts: toFormContacts(tenant) });
  }, [open, tenant, form]);

  function setPrimary(index: number) {
    const current = form.getValues('contacts');
    form.setValue(
      'contacts',
      current.map((c, i) => ({ ...c, isPrimary: i === index })),
    );
  }

  async function onSubmit(values: FormValues) {
    const contacts: TenantContactInput[] = values.contacts.map((c) => ({
      role: c.role,
      fullName: c.fullName.trim(),
      email: c.email.trim(),
      phone: c.phone?.trim() ? c.phone.trim() : undefined,
      isPrimary: c.isPrimary,
    }));

    const parsed = updateTenantContactsRequest.safeParse({ contacts });
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? 'Invalid contacts' });
      return;
    }

    try {
      await updateContacts.mutateAsync(parsed.data);
      onOpenChange(false);
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Update failed',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-hidden overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-neutral-100 px-5 py-4">
          <DialogTitle className="text-[15px] font-bold">Edit school contacts</DialogTitle>
          <DialogDescription className="text-[12px]">
            Primary contact syncs to welcome email and owner setup for {tenant.name}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4 p-5">
            {fields.map((field, index) => {
              const isPrimary = watchedContacts[index]?.isPrimary === true;
              return (
              <div
                key={field.id}
                className="space-y-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    Contact {index + 1}
                    {isPrimary ? ' · Primary' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => setPrimary(index)}
                        className="text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        Set primary
                      </button>
                    ) : null}
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="Remove contact"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name={`contacts.${index}.role`}
                  render={({ field: roleField }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                        Role
                      </FormLabel>
                      <FormControl>
                        <select
                          {...roleField}
                          className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px]"
                        >
                          {tenantContactRole.options.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`contacts.${index}.fullName`}
                  render={({ field: nameField }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                        Full name
                      </FormLabel>
                      <FormControl>
                        <Input {...nameField} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`contacts.${index}.email`}
                    render={({ field: emailField }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input {...emailField} type="email" className={inputClass} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`contacts.${index}.phone`}
                    render={({ field: phoneField }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                          Mobile (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...phoneField}
                            type="tel"
                            placeholder="+2348012345678"
                            className={inputClass}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            );
            })}

            {fields.length < 10 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  append({
                    role: 'operations',
                    fullName: '',
                    email: '',
                    phone: '',
                    isPrimary: false,
                  })
                }
              >
                <Plus aria-hidden className="mr-1.5 size-3.5" />
                Add another contact
              </Button>
            ) : null}

            {form.formState.errors.root || form.formState.errors.contacts ? (
              <p className="text-[12px] font-medium text-red-600">
                {form.formState.errors.root?.message ??
                  form.formState.errors.contacts?.message ??
                  'Check contact rows'}
              </p>
            ) : null}

            <DialogFooter className="gap-2 pt-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateContacts.isPending}>
                {updateContacts.isPending ? 'Saving…' : 'Save contacts'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
