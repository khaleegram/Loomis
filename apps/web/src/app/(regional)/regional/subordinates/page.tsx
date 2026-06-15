'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { ParticipantResponse } from '@loomis/contracts';
import { useCreateSubordinate, useRegionalSubordinates } from '@loomis/api-client';
import {
  Alert,
  AlertDescription,
  Badge,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  Skeleton,
  cn,
} from '@loomis/ui-web';
import { Mail, Phone, Plus, User, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { RegionalConsoleHero } from '@/components/regional/regional-console-hero';
import { PageBody } from '@/components/regional/regional-shell';
import {
  FormSubmitError,
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartFormSection,
  SmartHint,
  smartInputClass,
} from '@/components/shared/smart-form';
import { REGIONAL_PAGE_CLASS, REGIONAL_UI } from '@/lib/regional/regional-ui';
import { SURFACES } from '@/lib/design/surfaces';

const createSubordinateFormSchema = z.object({
  userId: z.string().uuid('Enter a valid platform user UUID'),
  contactName: z.string().min(2, 'Name is required'),
  contactEmail: z.string().email('Valid email required'),
  contactPhone: z.string().min(10, 'Phone number required'),
  region: z.string().optional(),
});

type CreateSubordinateForm = z.infer<typeof createSubordinateFormSchema>;

function statusBadge(status: ParticipantResponse['status']) {
  if (status === 'active') return <Badge className="bg-success/15 text-success">Active</Badge>;
  if (status === 'pending_kyc')
    return <Badge variant="outline" className="border-warning/40 text-warning">Pending KYC</Badge>;
  return <Badge variant="outline">Inactive</Badge>;
}

export default function SubordinatesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { data: subordinates, isLoading, isError } = useRegionalSubordinates();
  const createSubordinate = useCreateSubordinate();

  const form = useForm<CreateSubordinateForm>({
    resolver: zodResolver(createSubordinateFormSchema),
    defaultValues: {
      userId: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      region: '',
    },
  });

  const columns = useMemo<ColumnDef<ParticipantResponse>[]>(
    () => [
      {
        accessorKey: 'userId',
        header: 'User ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.userId.slice(0, 13)}…</span>
        ),
      },
      {
        accessorKey: 'participantType',
        header: 'Type',
        cell: () => <span className="text-sm">Subordinate</span>,
      },
      {
        accessorKey: 'region',
        header: 'Region',
        cell: ({ row }) => row.original.region ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('en-NG'),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: subordinates ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  async function onSubmit(values: CreateSubordinateForm) {
    try {
      await createSubordinate.mutateAsync({
        userId: values.userId,
        region: values.region || undefined,
      });
      form.reset();
      setSheetOpen(false);
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create subordinate',
      });
    }
  }

  const activeCount = (subordinates ?? []).filter((s) => s.status === 'active').length;
  const pendingKyc = (subordinates ?? []).filter((s) => s.status === 'pending_kyc').length;

  return (
    <PageBody className={REGIONAL_PAGE_CLASS}>
      <div className="space-y-6">
        <RegionalConsoleHero
          title="Subordinate management"
          description="Create and manage subordinates in your referral chain — US-REG-003"
          isLoading={isLoading}
          actions={
            <button type="button" className={REGIONAL_UI.btnPrimary} onClick={() => setSheetOpen(true)}>
              <Plus aria-hidden className="size-4" />
              Add subordinate
            </button>
          }
          stats={[
            {
              label: 'Total',
              value: String(subordinates?.length ?? 0),
              hint: 'In your chain',
              icon: Users,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Active',
              value: String(activeCount),
              hint: 'Verified',
              icon: Users,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'KYC pending',
              value: String(pendingKyc),
              hint: 'Awaiting platform ops',
              icon: Users,
              gradient: pendingKyc > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'Policy',
              value: 'Segregated',
              hint: 'You cannot approve KYC',
              icon: Users,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <Alert>
          <AlertDescription>
            You cannot approve your own subordinate&apos;s KYC — Platform Operations handles
            verification independently.
          </AlertDescription>
        </Alert>

        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>Failed to load subordinates.</AlertDescription>
          </Alert>
        ) : (
          <div className={`${REGIONAL_UI.dataPanel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={REGIONAL_UI.tableHeader}>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-brand-50/80">
                        {columns.map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-16 text-center">
                        <p className="text-[13px] text-neutral-500">No subordinates yet</p>
                        <button
                          type="button"
                          className={`mt-3 ${REGIONAL_UI.btnPrimary}`}
                          onClick={() => setSheetOpen(true)}
                        >
                          Create your first subordinate
                        </button>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t border-brand-50/80">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-neutral-800">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SmartFormHeader
            surface="sheet"
            eyebrow="Referral network"
            title="Add subordinate"
            description="They must already have a Loomis account. An invitation is sent after creation."
          />
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form id="add-subordinate-form" className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <FormSubmitError message={form.formState.errors.root?.message ?? null} />

                <SmartFormSection title="Contact" description="How we reach them about referrals">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <SmartFieldLabel>Full name</SmartFieldLabel>
                        <FormControl>
                          <div className="relative">
                            <User
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                            />
                            <Input {...field} className={cn(smartInputClass, 'pl-9')} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <SmartFieldLabel>Personal email</SmartFieldLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail
                                aria-hidden
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                              />
                              <Input type="email" {...field} className={cn(smartInputClass, 'pl-9')} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <SmartFieldLabel>Phone</SmartFieldLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone
                                aria-hidden
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                              />
                              <Input {...field} className={cn(smartInputClass, 'pl-9')} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </SmartFormSection>

                <SmartFormSection title="Platform account" description="UUID from invitation acceptance">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="00000000-0000-0000-0000-000000000000"
                            {...field}
                            className={cn(smartInputClass, 'font-mono text-[12px]')}
                          />
                        </FormControl>
                        <SmartHint>Required by the referral API after the subordinate registers.</SmartHint>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SmartFormSection>
              </form>
            </Form>
          </div>
          <SmartFormFooter
            formId="add-subordinate-form"
            submitLabel="Send invitation"
            pending={createSubordinate.isPending}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </PageBody>
  );
}
