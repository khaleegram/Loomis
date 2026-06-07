'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import type { IvpCasePriority } from '@loomis/contracts';
import {
  Badge,
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
  cn,
} from '@loomis/ui-web';
import { SeverityBadge, SEVERITY_ROW_BORDER } from './severity-badge';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RiskCaseRow {
  id: string;
  tenantId: string;
  tenantName: string;
  priority: IvpCasePriority;
  caseStatus: string;
  anomalyScore: number;
  reportedEnrollment: number;
  detectedAt: string;
  assignedToId: string | null;
}

// ── Status badge ───────────────────────────────────────────────────────────────

function CaseStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ').toLowerCase();
  const variant =
    status === 'OPEN'
      ? 'destructive'
      : status === 'INVESTIGATING'
        ? 'gold'
        : status === 'DISMISSED'
          ? 'secondary'
          : 'default';
  return <Badge variant={variant as 'destructive' | 'gold' | 'secondary' | 'default'}>{label}</Badge>;
}

// ── Table ──────────────────────────────────────────────────────────────────────

interface RiskCaseTableProps {
  cases: RiskCaseRow[];
  isLoading: boolean;
  priorityFilter: IvpCasePriority | null;
  onRowClick: (caseId: string) => void;
}

export function RiskCaseTable({
  cases,
  isLoading,
  priorityFilter,
  onRowClick,
}: RiskCaseTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'priority', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');

  const filteredCases = cases.filter((c) => {
    if (priorityFilter && c.priority !== priorityFilter) return false;
    if (
      statusFilter === 'open' &&
      c.caseStatus !== 'OPEN' &&
      c.caseStatus !== 'INVESTIGATING'
    )
      return false;
    if (statusFilter === 'resolved' && !c.caseStatus.startsWith('RESOLVED')) return false;
    if (statusFilter === 'dismissed' && c.caseStatus !== 'DISMISSED') return false;
    return true;
  });

  const columns: ColumnDef<RiskCaseRow>[] = [
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-auto px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Severity
          <ArrowUpDown aria-hidden className="ml-1 size-3 opacity-60" />
        </Button>
      ),
      cell: ({ row }) => <SeverityBadge priority={row.original.priority} />,
      sortingFn: (a, b) => {
        const order = { urgent: 0, standard: 1, watchlist: 2 };
        return (order[a.original.priority] ?? 3) - (order[b.original.priority] ?? 3);
      },
    },
    {
      accessorKey: 'id',
      header: 'Case ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          ···{row.original.id.slice(-8)}
        </span>
      ),
    },
    {
      accessorKey: 'tenantName',
      header: 'School',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.tenantName}</span>
      ),
    },
    {
      accessorKey: 'anomalyScore',
      header: 'Score',
      cell: ({ row }) => {
        const score = row.original.anomalyScore;
        const scoreColor =
          score >= 0.8
            ? 'text-red-600 dark:text-red-400'
            : score >= 0.5
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground';
        return (
          <span className={cn('font-mono text-sm font-semibold tabular-nums', scoreColor)}>
            {(score * 100).toFixed(0)}
          </span>
        );
      },
    },
    {
      accessorKey: 'caseStatus',
      header: 'Status',
      cell: ({ row }) => <CaseStatusBadge status={row.original.caseStatus} />,
    },
    {
      accessorKey: 'detectedAt',
      header: 'Detected',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.detectedAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'action',
      header: '',
      cell: () => (
        <ChevronRight aria-hidden className="size-4 text-muted-foreground opacity-50 transition-opacity group-hover/row:opacity-100" />
      ),
    },
  ];

  const table = useReactTable({
    data: filteredCases,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search school or case…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open &amp; Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-forest-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-950 dark:hover:bg-forest-950"
              >
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
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
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-16 text-center text-sm text-muted-foreground"
                >
                  {priorityFilter
                    ? `No ${priorityFilter} cases for the selected filters.`
                    : 'No cases match the selected filters. All clear.'}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick(row.original.id)}
                  className={cn(
                    'group/row cursor-pointer border-b border-neutral-100 border-l-[3px] transition-colors',
                    'hover:bg-neutral-50 dark:border-forest-800 dark:hover:bg-forest-800/50',
                    SEVERITY_ROW_BORDER[row.original.priority],
                  )}
                >
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

      {!isLoading && table.getRowModel().rows.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredCases.length} cases
        </p>
      ) : null}
    </div>
  );
}
