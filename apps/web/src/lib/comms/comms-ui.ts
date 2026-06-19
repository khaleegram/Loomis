/** Message-center layout — no hero; sidebar + main pane. */
export const COMMS_PAGE_CLASS = 'max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6';

export const COMMS_UI = {
  navItem:
    'flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors',
  navItemActive:
    'bg-brand-50 text-brand-900 ring-1 ring-brand-200/60 dark:bg-accent dark:text-accent-foreground dark:ring-border',
  navItemInactive: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  unreadDot: 'size-2 shrink-0 rounded-full bg-brand-500',
  messageRow:
    'group flex w-full gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/50',
  messageRowUnread: 'border-border bg-accent/40',
} as const;
