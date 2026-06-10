export { Alert, AlertDescription, AlertTitle } from './components/ui/alert.js';
export { Badge, badgeVariants, type BadgeProps } from './components/ui/badge.js';
export { Button, buttonVariants, type ButtonProps } from './components/ui/button.js';
export { Checkbox } from './components/ui/checkbox.js';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card.js';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog.js';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu.js';
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './components/ui/form.js';
export { Input } from './components/ui/input.js';
export { Label } from './components/ui/label.js';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/ui/select.js';
export { Separator } from './components/ui/separator.js';
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from './components/ui/sheet.js';
export { Skeleton } from './components/ui/skeleton.js';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table.js';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.js';
export { Textarea } from './components/ui/textarea.js';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip.js';
export {
  WeightLedgerBar,
  type WeightLedgerBarProps,
} from './components/ui/weight-ledger-bar.js';
export {
  SegmentedControl,
  type SegmentedControlOption,
  type SegmentedControlProps,
} from './components/ui/segmented-control.js';
export { CurrencyInput, type CurrencyInputProps } from './components/ui/currency-input.js';
export {
  JournalVoucherCard,
  type JournalVoucherCardProps,
  type JournalVoucherLeg,
} from './components/ui/journal-voucher-card.js';
export {
  LedgerEntryTable,
  type LedgerEntryRow,
  type LedgerEntryTableProps,
} from './components/ui/ledger-entry-table.js';
export {
  PriorityBadge,
  breachPriority,
  dsarPriority,
  type PriorityBadgeProps,
} from './components/ui/priority-badge.js';
export { CountdownRing, type CountdownRingProps } from './components/ui/countdown-ring.js';
export { FilterChipBar, type FilterChip, type FilterChipBarProps } from './components/ui/filter-chip-bar.js';
export {
  SmartSearchSelect,
  type SmartSearchOption,
  type SmartSearchSelectProps,
} from './components/ui/smart-search-select.js';
export { ProgressStrip, type ProgressStripProps } from './components/ui/progress-strip.js';
export { cn } from './lib/utils.js';

/* ── Layout (V2) ── */
export { AppShell, type AppShellProps } from './components/layout/app-shell.js';
export {
  SidebarFrame,
  SidebarBrand,
  SidebarNavItem,
  SidebarSectionLabel,
  SidebarTrustCard,
  SidebarUserProfile,
  type SidebarBrandProps,
  type SidebarNavItemProps,
  type SidebarSectionLabelProps,
  type SidebarFrameProps,
  type SidebarUserProfileProps,
} from './components/layout/sidebar.js';
export { ScopeBar, type ScopeBarProps } from './components/layout/scope-bar.js';
export {
  DashboardPageHeader,
  type DashboardPageHeaderProps,
} from './components/layout/dashboard-page-header.js';
export { PageHeader, PageBody, type PageHeaderProps } from './components/layout/page-chrome.js';

/* ── Dashboard (V2) ── */
export { MetricCard, type MetricCardProps, type MetricAccent } from './components/dashboard/metric-card.js';
export { ChartCard, type ChartCardProps } from './components/dashboard/chart-card.js';
export { QuickActionList, type QuickActionItem, type QuickActionListProps } from './components/dashboard/quick-action-list.js';
export { SectionLabel, type SectionLabelProps } from './components/dashboard/section-label.js';
export { Sparkline, type SparklineProps, type SparklineTrend } from './components/dashboard/sparkline.js';
export { TrendBadge, type TrendBadgeProps } from './components/dashboard/trend-badge.js';
export { MetricStrip, MetricStripCard, type MetricStripCardProps } from './components/dashboard/metric-strip.js';
export { EmptyState, type EmptyStateProps } from './components/dashboard/empty-state.js';
