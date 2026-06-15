'use client';

import { useMemo, useState } from 'react';
import { useMarkNotificationRead, useNotifications } from '@loomis/api-client';
import type { Role } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';

import { CommsComposeAnnouncement } from '@/components/comms/comms-compose-announcement';
import { CommsComposeClassMessage } from '@/components/comms/comms-compose-class-message';
import { CommsComposeStudentParent } from '@/components/comms/comms-compose-student-parent';
import { CommsInbox } from '@/components/comms/comms-inbox';
import { CommsNav, COMMS_NAV_ITEMS, type CommsSection } from '@/components/comms/comms-nav';
import { CommsPageHeader } from '@/components/comms/comms-page-header';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { COMMS_PAGE_CLASS } from '@/lib/comms/comms-ui';
import { useCan, useRole } from '@/lib/auth/use-capability';
import { useTeachingStaffScope } from '@/lib/timetable/use-teaching-staff-scope';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const ANNOUNCEMENT_ROLES = new Set<Role>(['school_owner', 'principal', 'admin_officer']);

function defaultSection(canAnnounce: boolean, canMessageParents: boolean): CommsSection {
  if (canAnnounce) return 'announcements';
  if (canMessageParents) return 'parents';
  return 'notifications';
}

function sectionSubtitle(section: CommsSection, isClassTeacher: boolean): string {
  switch (section) {
    case 'announcements':
      return 'Broadcast school-wide updates to staff and parents.';
    case 'parents':
      return isClassTeacher
        ? 'Message all parents in your class, or parents of specific students.'
        : 'Send a message to a student\'s linked parent accounts.';
    case 'notifications':
      return 'Your in-app inbox for announcements, alerts, and updates.';
  }
}

export default function CommsPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canAnnounce = role ? ANNOUNCEMENT_ROLES.has(role) : false;
  const canMessageParents = useCan('parent.message');
  const isClassTeacher = role === 'class_teacher';

  const teacherCtx = useTeachingStaffScope(tenantId ?? '', { mode: 'classTeacherClass' });

  const [section, setSection] = useState<CommsSection>(() =>
    defaultSection(canAnnounce, canMessageParents),
  );

  const notificationsQuery = useNotifications(tenantId ?? '');
  const markRead = useMarkNotificationRead(tenantId ?? '');

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  );

  const navItems = [
    { ...COMMS_NAV_ITEMS.announcements, show: canAnnounce },
    { ...COMMS_NAV_ITEMS.parents, show: canMessageParents },
    {
      ...COMMS_NAV_ITEMS.notifications,
      show: true,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  if (!tenantId) {
    return (
      <PageBody className={COMMS_PAGE_CLASS}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={COMMS_PAGE_CLASS}>
      <div className="space-y-5">
        <CommsPageHeader
          unreadCount={unreadCount}
          subtitle={sectionSubtitle(section, isClassTeacher)}
        />

        <div className="lg:hidden">
          <CommsNav items={navItems} active={section} onChange={setSection} layout="tabs" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <CommsNav items={navItems} active={section} onChange={setSection} layout="sidebar" />
          </aside>

          <main className="min-w-0">
            {section === 'announcements' && canAnnounce ? (
              <CommsComposeAnnouncement tenantId={tenantId} />
            ) : null}

            {section === 'parents' && canMessageParents ? (
              isClassTeacher ? (
                <CommsComposeClassMessage tenantId={tenantId} ctx={teacherCtx} />
              ) : (
                <CommsComposeStudentParent tenantId={tenantId} />
              )
            ) : null}

            {section === 'notifications' ? (
              <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
                <CommsInbox
                  notifications={notifications}
                  isLoading={notificationsQuery.isLoading}
                  isMarking={markRead.isPending}
                  onMarkRead={(notificationId) => markRead.mutate({ notificationId })}
                />
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </PageBody>
  );
}
