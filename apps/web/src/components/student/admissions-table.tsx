'use client';

import type { AdmissionResponse, ClassLevelResponse } from '@loomis/contracts';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AdmissionStatusBadge } from '@/components/student/admission-status-badge';
import type { KpiFilter } from '@/components/student/admissions-kpi-cards';
import {
  formatCalendarDate,
  relationshipLabel,
  studentDisplayName,
} from '@/lib/student/student-labels';

type StatusFilter = 'all' | AdmissionResponse['status'];

interface AdmissionsTableProps {
  admissions: AdmissionResponse[];
  classLevels: ClassLevelResponse[];
  kpiFilter: KpiFilter | null;
  canDecide: boolean;
  onDecide: (admission: AdmissionResponse) => void;
}

function classLevelName(levels: ClassLevelResponse[], id: string): string {
  return levels.find((l) => l.id === id)?.name ?? '—';
}

function applyKpiFilter(
  rows: AdmissionResponse[],
  kpiFilter: KpiFilter | null,
): AdmissionResponse[] {
  if (!kpiFilter) return rows;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  switch (kpiFilter) {
    case 'pending':
      return rows.filter((a) => a.status === 'pending');
    case 'approved_week':
      return rows.filter(
        (a) =>
          a.status === 'approved' &&
          a.decidedAt &&
          new Date(a.decidedAt) >= weekAgo,
      );
    case 'declined':
      return rows.filter((a) => a.status === 'declined');
    default:
      return rows;
  }
}

export function AdmissionsTable({
  admissions,
  classLevels,
  kpiFilter,
  canDecide,
  onDecide,
}: AdmissionsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const filteredData = useMemo(() => {
    let rows = applyKpiFilter(admissions, kpiFilter);
    if (statusFilter !== 'all') {
      rows = rows.filter((a) => a.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (a) =>
          a.referenceNumber.toLowerCase().includes(q) ||
          studentDisplayName(a.firstName, a.lastName).toLowerCase().includes(q) ||
          a.guardianName.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [admissions, kpiFilter, search, statusFilter]);

  const columns = useMemo<ColumnDef<AdmissionResponse>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: 'Ref #',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.referenceNumber}
          </span>
        ),
      },
      {
        id: 'applicant',
        accessorFn: (row) => studentDisplayName(row.firstName, row.lastName),
        header: 'Applicant',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-foreground">
              {studentDisplayName(row.original.firstName, row.original.lastName)}
            </div>
            <div className="text-xs text-muted-foreground">
              DOB {formatCalendarDate(row.original.dateOfBirth)}
            </div>
          </div>
        ),
      },
      {
        id: 'classLevel',
        accessorFn: (row) => classLevelName(classLevels, row.intendedClassLevelId),
        header: 'Intended class',
      },
      {
        id: 'guardian',
        header: 'Guardian',
        cell: ({ row }) => (
          <div>
            <div className="text-foreground">{row.original.guardianName}</div>
            <div className="text-xs text-muted-foreground">
              {relationshipLabel(row.original.guardianRelationship)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Submitted',
        cell: ({ row }) => formatCalendarDate(row.original.createdAt.slice(0, 10)),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <AdmissionStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const admission = row.original;
          if (admission.status === 'pending' && canDecide) {
            return (
              <Button variant="outline" size="sm" onClick={() => onDecide(admission)}>
                Review
              </Button>
            );
          }
          if (admission.status === 'approved' && admission.studentId) {
            return (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/school/students/${admission.studentId}`}>View student</Link>
              </Button>
            );
          }
          if (admission.status === 'declined' && admission.declineReason) {
            return (
              <span className="max-w-[12rem] truncate text-xs text-muted-foreground" title={admission.declineReason}>
                {admission.declineReason}
              </span>
            );
          }
          return null;
        },
      },
    ],
    [canDecide, classLevels, onDecide],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, ref #, or guardian…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search admissions"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No applications match your filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
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
    </div>
  );
}

export function AdmissionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-sm" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
