'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from '@loomis/ui-web';

export type SmartSearchItem = {
  id: string;
  label: string;
  href: string;
  group?: string;
  keywords?: string;
};

export interface SmartSearchPaletteProps {
  items: SmartSearchItem[];
  placeholder: string;
  ariaLabel: string;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function matchesQuery(item: SmartSearchItem, query: string): boolean {
  if (!query) return true;
  const haystack = normalize(`${item.label} ${item.group ?? ''} ${item.keywords ?? ''}`);
  return haystack.includes(normalize(query));
}

export function SmartSearchPalette({ items, placeholder, ariaLabel }: SmartSearchPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SmartSearchItem[]>();
    for (const item of filtered) {
      const group = item.group ?? 'Quick actions';
      const bucket = map.get(group) ?? [];
      bucket.push(item);
      map.set(group, bucket);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectItem = (item: SmartSearchItem) => {
    setOpen(false);
    router.push(item.href);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && filtered[activeIndex]) {
      event.preventDefault();
      selectItem(filtered[activeIndex]!);
    }
  };

  let runningIndex = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-black/[0.06] bg-neutral-50 px-3.5 py-1.5 text-left transition-all duration-150 hover:border-black/[0.10] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
        aria-label={ariaLabel}
      >
        <Search aria-hidden className="size-4 shrink-0 text-neutral-400" />
        <span className="flex-1 truncate text-[13.5px] text-neutral-400">{placeholder}</span>
        <kbd className="hidden shrink-0 rounded-md border border-black/[0.08] bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 shadow-[0_1px_1px_rgba(0,0,0,0.04)] lg:block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 shadow-[0_20px_60px_rgba(15,23,42,0.16)] sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Search console</DialogTitle>
            <DialogDescription>{placeholder}</DialogDescription>
          </DialogHeader>

          <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/15"
              />
            </div>
          </div>

          <div className="max-h-[min(22rem,50vh)] overflow-y-auto p-2 [scrollbar-width:thin]">
            {grouped.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-neutral-400">No results for &ldquo;{query}&rdquo;</p>
            ) : (
              grouped.map(([group, groupItems]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      runningIndex += 1;
                      const itemIndex = runningIndex;
                      const isActive = itemIndex === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          onClick={() => selectItem(item)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition',
                            isActive
                              ? 'bg-brand-600 text-white shadow-[0_4px_12px_rgba(153,121,77,0.28)]'
                              : 'text-neutral-700 hover:bg-neutral-50',
                          )}
                        >
                          <span className="flex-1 truncate">{item.label}</span>
                          <ArrowRight
                            aria-hidden
                            className={cn('size-3.5 shrink-0', isActive ? 'text-white/80' : 'text-neutral-300')}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function navItemsToSearchItems(
  sections: { title: string; items: { label: string; href: string }[] }[],
): SmartSearchItem[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({
      id: item.href,
      label: item.label,
      href: item.href,
      group: section.title,
      keywords: item.href,
    })),
  );
}
