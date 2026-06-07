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
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/regional/regional-shell';

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

  return (
    <>
      <PageHeader
        title="Subordinate Management"
        description="Create and manage subordinates in your referral chain — US-REG-003"
        actions={
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus aria-hidden className="mr-1.5 size-4" />
            Add Subordinate
          </Button>
        }
      />
      <PageBody>
        <Alert className="mb-6">
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
          <div className="rounded-lg border border-neutral-200 bg-white shadow-card dark:border-forest-800 dark:bg-forest-900">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center">
                      <p className="text-sm text-muted-foreground">No subordinates yet</p>
                      <Button variant="link" className="mt-2" onClick={() => setSheetOpen(true)}>
                        Create your first subordinate
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">Add Subordinate</SheetTitle>
            <SheetDescription>
              The person must have a Loomis account. An invitation link is sent after creation.
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}
              <FormField
                control={form.control}
                name="contactName"
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
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="UUID from invitation acceptance" {...field} />
                    </FormControl>
                    <FormDescription>
                      Required by the referral API after the subordinate registers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={createSubordinate.isPending}>
                {createSubordinate.isPending ? 'Creating…' : 'Send Invitation'}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
