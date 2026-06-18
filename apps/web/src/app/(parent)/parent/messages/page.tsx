'use client';

import { useMemo, useState } from 'react';
import {
  useMarkAnyNotificationRead,
  useMarkNotificationRead,
  useNotifications,
  useParentDashboard,
  useParentInboxNotifications,
} from '@loomis/api-client';
import type { NotificationResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';

import {
  CommsInbox,
  type InboxNotificationItem,
} from '@/components/comms/comms-inbox';
import {
  CommsMessageDetailSheet,
  type CommsNotificationContext,
} from '@/components/comms/comms-message-detail-sheet';
import { ParentInboxHero } from '@/components/parent/parent-inbox-hero';
import { PageBody } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';

type SchoolFilter = 'all' | string;

function ParentInboxView() {
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);
  const dashboardQuery = useParentDashboard();
  const cards = dashboardQuery.data?.cards ?? [];
  const tenantIds = useMemo(() => cards.map((card) => card.tenantId), [cards]);
  const schoolNames = useMemo(
    () => new Map(cards.map((card) => [card.tenantId, card.schoolName])),
    [cards],
  );

  const inboxQuery = useParentInboxNotifications(tenantIds);
  const [schoolFilter, setSchoolFilter] = useState<SchoolFilter>('all');
  const [selected, setSelected] = useState<CommsNotificationContext | null>(null);

  const notifications: InboxNotificationItem[] = useMemo(() => {
    return inboxQuery.notifications.map((notification) => ({
      ...notification,
      schoolName: schoolNames.get(notification.tenantId ?? '') ?? null,
    }));
  }, [inboxQuery.notifications, schoolNames]);

  const filteredNotifications = useMemo(() => {
    if (schoolFilter === 'all') return notifications;
    return notifications.filter((notification) => notification.tenantId === schoolFilter);
  }, [notifications, schoolFilter]);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const markRead = useMarkAnyNotificationRead();

  function handleSelect(notification: InboxNotificationItem) {
    const tenantId = notification.tenantId ?? '';
    if (tenantId) setActiveTenantId(tenantId);
    setSelected({
      ...notification,
      tenantId,
      schoolName: notification.schoolName,
    });
  }

  function handleMarkRead(notification: InboxNotificationItem) {
    const tenantId = notification.tenantId ?? '';
    if (!tenantId) return;
    setActiveTenantId(tenantId);
    markRead.mutate({ tenantId, notificationId: notification.id });
  }

  if (dashboardQuery.isLoading) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  if (cards.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No linked children found. Accept a school invitation to receive messages.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ParentInboxHero
        unreadCount={unreadCount}
        totalCount={notifications.length}
        schoolCount={tenantIds.length}
        isLoading={inboxQuery.isLoading}
      />

      {tenantIds.length > 1 ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:max-w-sm`} data-print-hide="true">
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">
            School
          </Label>
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="All schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schools</SelectItem>
              {cards.map((card) => (
                <SelectItem key={card.tenantId} value={card.tenantId}>
                  {card.schoolName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
        <CommsInbox
          notifications={filteredNotifications}
          isLoading={inboxQuery.isLoading}
          isMarking={markRead.isPending}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          onMarkRead={handleMarkRead}
        />
      </div>

      <CommsMessageDetailSheet
        notification={selected}
        onClose={() => setSelected(null)}
        allowParentReply
      />
    </div>
  );
}

function StudentInboxView({ tenantId }: { tenantId: string }) {
  const notificationsQuery = useNotifications(tenantId);
  const [selected, setSelected] = useState<CommsNotificationContext | null>(null);
  const markRead = useMarkNotificationRead(tenantId);

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  function handleSelect(notification: NotificationResponse) {
    setSelected({
      ...notification,
      tenantId: notification.tenantId ?? tenantId,
    });
  }

  return (
    <div className="space-y-6">
      <ParentInboxHero
        unreadCount={unreadCount}
        totalCount={notifications.length}
        schoolCount={1}
        isLoading={notificationsQuery.isLoading}
      />

      <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
        <CommsInbox
          notifications={notifications}
          isLoading={notificationsQuery.isLoading}
          isMarking={markRead.isPending}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          onMarkRead={(notification) => markRead.mutate({ notificationId: notification.id })}
        />
      </div>

      <CommsMessageDetailSheet notification={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function ParentMessagesPage() {
  const { session } = useAuth();
  const tenantId = useActiveTenantStore((s) => s.tenantId);
  const isStudent = session?.role === 'student';

  if (isStudent) {
    return (
      <PageBody className="max-w-[1100px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        {tenantId ? (
          <StudentInboxView tenantId={tenantId} />
        ) : (
          <Alert>
            <AlertDescription>No school context. Sign in again.</AlertDescription>
          </Alert>
        )}
      </PageBody>
    );
  }

  if (session?.role !== 'parent') {
    return (
      <PageBody className="max-w-[1100px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        <Alert>
          <AlertDescription>This inbox is for parent and student accounts.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[1100px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <ParentInboxView />
    </PageBody>
  );
}
