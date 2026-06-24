'use client';

import { useEffect } from 'react';
import { updateTenantProfileRequest } from '@loomis/contracts';
import type { TenantResponse } from '@loomis/contracts';
import { useUpdateTenantProfile } from '@loomis/api-client';
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
  SmartSearchSelect,
  Textarea,
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { z as zType } from 'zod';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

const STATE_OPTIONS = NIGERIAN_STATES.map((state) => ({
  value: state,
  label: state,
  keywords: state === 'FCT' ? 'Abuja Federal Capital Territory' : state,
}));

const editFormSchema = z.object({
  address: z.string().min(2).max(500),
  region: z.string().min(2).max(100),
});

type FormValues = z.infer<typeof editFormSchema>;

const inputClass =
  'h-10 rounded-lg border-neutral-200 bg-white text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200';

interface TenantProfileEditDialogProps {
  tenant: TenantResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantProfileEditDialog({
  tenant,
  open,
  onOpenChange,
}: TenantProfileEditDialogProps) {
  const updateProfile = useUpdateTenantProfile(tenant.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      address: tenant.address,
      region: tenant.region,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      address: tenant.address,
      region: tenant.region,
    });
  }, [open, tenant, form]);

  async function onSubmit(values: FormValues) {
    const patch: zType.infer<typeof updateTenantProfileRequest> = {};
    if (values.address && values.address !== tenant.address) patch.address = values.address;
    if (values.region && values.region !== tenant.region) patch.region = values.region;

    if (Object.keys(patch).length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      await updateProfile.mutateAsync(patch);
      onOpenChange(false);
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Update failed',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-neutral-100 px-5 py-4">
          <DialogTitle className="text-[15px] font-bold">Edit school location</DialogTitle>
          <DialogDescription className="text-[12px]">
            Update region and physical address for {tenant.name}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4 p-5">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    State / region
                  </FormLabel>
                  <FormControl>
                    <SmartSearchSelect
                      value={field.value || null}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      options={STATE_OPTIONS}
                      placeholder="Search state…"
                      searchPlaceholder="Type state name…"
                      triggerClassName={cn(inputClass, 'h-10 w-full justify-between px-3 font-normal')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    Address
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      className="min-h-[80px] resize-none rounded-lg border-neutral-200 text-[13px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root ? (
              <p className="text-[12px] font-medium text-red-600">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter className="gap-2 pt-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
