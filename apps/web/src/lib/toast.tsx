'use client';

import { create } from 'zustand';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@loomis/ui-web';
import { Alert, AlertDescription } from '@loomis/ui-web';

type ToastVariant = 'default' | 'success' | 'destructive';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, variant = 'default') => {
    const id = `toast-${++counter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 300);
    }, 4000);
  },
  dismissToast: (id) => {
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 300);
  },
}));

export function toast(message: string, variant?: ToastVariant) {
  useToastStore.getState().addToast(message, variant);
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-neutral-200 dark:border-neutral-700',
  success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100',
  destructive: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-lg border bg-background shadow-lg transition-all duration-300',
            t.exiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100',
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', variantStyles[t.variant])}>{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
