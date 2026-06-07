'use client';

import type { StudentResponse } from '@loomis/contracts';
import {
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

import { StudentStatusBadge } from '@/components/student/student-status-badge';
import {
  formatCalendarDate,
  genderLabel,
  studentDisplayName,
} from '@/lib/student/student-labels';

type StatusFilter = 'all' | StudentResponse['status'];

interface StudentsTableProps {
  students: StudentResponse[];
}

export function StudentsTable({ students }: StudentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  const filteredData = useMemo(() => {
    let rows = students;
    if (statusFilter !== 'all') {
      rows = rows.filter((s) => s.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) =>
          studentDisplayName(s.firstName, s.lastName).toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [search, statusFilter, students]);

  const columns = useMemo<ColumnDef<StudentResponse>[]>(
    () => [
      {
        accessorKey: 'admissionNo',
        header: 'File #',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gold-700 dark:text-gold-300">
            {row.original.admissionNo}
          </span>
        ),
      },
      {
        id: 'name',
        accessorFn: (row) => studentDisplayName(row.firstName, row.lastName),
        header: 'Student',
        cell: ({ row }) => (
          <Link
            href={`/school/students/${row.original.id}`}
            className="font-medium text-foreground hover:text-brand-600 hover:underline dark:hover:text-mint-400"
          >
            {studentDisplayName(row.original.firstName, row.original.lastName)}
          </Link>
        ),
      },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of birth',
        cell: ({ row }) => formatCalendarDate(row.original.dateOfBirth),
      },
      {
        accessorKey: 'gender',
        header: 'Gender',
        cell: ({ row }) => genderLabel(row.original.gender),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StudentStatusBadge status={row.original.status} />,
      },
    ],
    [],
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
          placeholder="Search by name or file number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search students"
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
            <SelectItem value="admitted">Admitted</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
            <SelectItem value="transferred_out">Transferred out</SelectItem>
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
                  No students match your filters.
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

export function StudentsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-sm" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
