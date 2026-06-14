/** Visual language for the digital gradebook — spreadsheet, not dashboard. */
export const GRADEBOOK_UI = {
  /** Outer notebook frame */
  frame: 'flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-lg border border-neutral-300 bg-[#faf8f5] shadow-sm',
  /** Top chrome — one compact bar */
  toolbar:
    'flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-300 bg-[#f3f0ea] px-3 py-2 sm:gap-3 sm:px-4',
  /** Bottom status strip (Excel-style) */
  statusBar:
    'flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-300 bg-[#ebe7df] px-3 py-1.5 text-[11px] text-neutral-600 sm:px-4',
  /** Grid scroll region */
  gridViewport: 'min-h-0 flex-1 overflow-auto bg-white',
  /** Column header row */
  colHeader: 'bg-[#f3f0ea] text-[10px] font-bold uppercase tracking-wider text-neutral-500',
  /** Sticky corner / row header */
  rowHeader: 'sticky left-0 z-20 bg-[#f3f0ea] text-[11px] font-medium text-neutral-600',
  /** Data cell */
  cell: 'border border-neutral-200 p-0 text-center align-middle',
  /** Editable score cell */
  scoreInput:
    'h-full w-full min-h-[34px] border-0 bg-transparent px-2 text-center font-mono text-[13px] tabular-nums outline-none focus:bg-brand-50 focus:ring-2 focus:ring-inset focus:ring-brand-400/50',
  scoreInputError:
    'h-full w-full min-h-[34px] border-0 bg-red-50 px-2 text-center font-mono text-[13px] tabular-nums text-red-700 outline-none ring-2 ring-inset ring-red-400 animate-gradebook-shake',
  /** Locked / computed cell */
  scoreReadonly: 'bg-neutral-50/80 font-mono text-[13px] tabular-nums text-neutral-800',
  /** Sheet tab active */
  tabActive:
    'rounded-t-md border border-b-0 border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-900 shadow-sm',
  /** Sheet tab inactive */
  tabInactive:
    'rounded-t-md border border-transparent px-3 py-1.5 text-[11px] font-medium text-neutral-500 hover:bg-white/60 hover:text-neutral-800',
  select:
    'h-8 rounded border border-neutral-300 bg-white px-2 text-[12px] font-medium text-neutral-800 outline-none focus:border-brand-400',
  /** Searchable scope trigger — matches notebook chrome */
  scopeTrigger:
    'h-8 min-w-[7.5rem] max-w-[11rem] rounded-md border border-neutral-300 bg-white px-2.5 text-[12px] font-semibold text-neutral-800 shadow-none hover:border-neutral-400 hover:bg-neutral-50',
  /** View mode pill group */
  viewSwitch:
    'inline-flex shrink-0 rounded-lg border border-neutral-300 bg-white p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]',
  viewSwitchBtn:
    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-3',
  viewSwitchBtnActive: 'bg-brand-700 text-white shadow-sm',
  viewSwitchBtnInactive: 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
  reportCard:
    'rounded-xl border border-neutral-300 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]',
  /** Printable report card sheet */
  reportCardDocument:
    'overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] print:rounded-none print:border-neutral-400 print:shadow-none',
  reportCardTableHead: 'bg-[linear-gradient(180deg,#f3efe6_0%,#ebe6dc_100%)] text-neutral-700',
  /** Report card bureau — split student list + document */
  reportCardFrame:
    'overflow-visible rounded-xl border border-neutral-300 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] print:border-0 print:shadow-none',
} as const;
