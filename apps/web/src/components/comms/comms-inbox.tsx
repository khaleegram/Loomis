'use client';

import type { NotificationResponse } from '@loomis/contracts';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check } from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { COMMS_UI } from '@/lib/comms/comms-ui';
import { formatNotificationType } from '@/lib/comms/comms-labels';
import { cn } from '@loomis/ui-web';

interface CommsInboxProps {
  notifications: NotificationResponse[];
  isLoading?: boolean;
  isMarking?: boolean;
  onMarkRead: (notificationId: string) => void;
}

export function CommsInbox({ notifications, isLoading, isMarking, onMarkRead }: CommsInboxProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Bell aria-hidden className="size-5" />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-neutral-800">Inbox is clear</p>
        <p className="mt-1 max-w-sm text-[13px] text-neutral-500">
          Announcements, class updates, and system alerts will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {notifications.map((notification) => {
        const unread = !notification.readAt;
        return (
          <li key={notification.id}>
            <div
              className={cn(
                'group',
                COMMS_UI.messageRow,
                unread ? COMMS_UI.messageRowUnread : 'bg-white',
                'items-start sm:items-center',
              )}
            >
              <span
                className={cn('mt-2 sm:mt-0', unread ? COMMS_UI.unreadDot : 'size-2 shrink-0 rounded-full bg-transparent')}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn('truncate text-[14px]', unread ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800')}>
                    {notification.title}
                  </p>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    {formatNotificationType(notification.notificationType)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-neutral-600">{notification.body}</p>
                <p className="mt-1.5 text-[11px] font-medium text-neutral-400">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
              {unread ? (
                <button
                  type="button"
                  className={cn(ACADEMIC_UI.btnSecondarySm, 'shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100')}
                  disabled={isMarking}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <Check aria-hidden className="size-3.5" />
                  Read
                </button>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent-green-700">
                  <Check aria-hidden className="size-3.5" />
                  Read
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
