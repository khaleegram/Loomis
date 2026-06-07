// @ts-nocheck
'use client';

import { useState } from 'react';
import { useSendAnnouncement, useSendClassMessage, useNotifications, useMarkNotificationRead } from '@loomis/api-client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@loomis/ui-web';
import { Megaphone, MessageCircle, Bell, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';

const announcementSchema = z.object({
  subject: z.string().min(1, 'Subject required'),
  body: z.string().min(1, 'Body required'),
  audience: z.enum(['all', 'staff_and_parents']),
});

const classMessageSchema = z.object({
  termId: z.string(),
  classArmId: z.string().min(1, 'Class required'),
  subject: z.string().min(1, 'Subject required'),
  body: z.string().min(1, 'Message required'),
});

type AnnouncementForm = z.infer<typeof announcementSchema>;
type ClassMessageForm = z.infer<typeof classMessageSchema>;

export default function CommsPage() {
  const tenantId = useTenantId();
  const canAnnounce = useCan('staff.onboard');
  const canClassMsg = useCan('attendance.mark');
  const [tab, setTab] = useState<'announcements' | 'class-messages' | 'notifications'>('announcements');

  const { data: notifData, isLoading: notifLoading } = useNotifications(tenantId ?? '');
  const sendAnnouncement = useSendAnnouncement(tenantId ?? '');
  const sendClassMessage = useSendClassMessage(tenantId ?? '');
  const markRead = useMarkNotificationRead(tenantId ?? '');

  const notifications = (notifData as any)?.notifications ?? [];

  const announcementForm = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { subject: '', body: '', audience: 'all' },
  });

  const classMsgForm = useForm<ClassMessageForm>({
    resolver: zodResolver(classMessageSchema),
    defaultValues: { termId: '', classArmId: '', subject: '', body: '' },
  });

  async function onAnnounce(values: AnnouncementForm) {
    try { await sendAnnouncement.mutateAsync(values); announcementForm.reset(); } catch { /* handled */ }
  }

  async function onClassMsg(values: ClassMessageForm) {
    try { await sendClassMessage.mutateAsync(values); classMsgForm.reset(); } catch { /* handled */ }
  }

  const tabs = [
    { key: 'announcements', label: 'Announcements', icon: Megaphone, show: canAnnounce },
    { key: 'class-messages', label: 'Class Messages', icon: MessageCircle, show: canClassMsg },
    { key: 'notifications', label: `Notifications (${notifications.length})`, icon: Bell, show: true },
  ] as const;

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Communications" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Communications" description="Send announcements, class messages, and view notifications" />
      <PageBody>
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.filter((t) => t.show).map((t) => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.key as any)}>
              <t.icon className="mr-1.5 size-3.5" /> {t.label}
            </Button>
          ))}
        </div>

        {tab === 'announcements' ? (
          <Card>
            <CardHeader><CardTitle className="text-base">School-Wide Announcement</CardTitle></CardHeader>
            <CardContent>
              <Form {...announcementForm}>
                <form onSubmit={announcementForm.handleSubmit(onAnnounce)} className="space-y-4">
                  <FormField control={announcementForm.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={announcementForm.control} name="audience" render={({ field }) => (
                    <FormItem><FormLabel>Audience</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="staff_and_parents">Staff & Parents</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={announcementForm.control} name="body" render={({ field }) => (
                    <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={sendAnnouncement.isPending}>
                      <Megaphone className="mr-1.5 size-4" /> {sendAnnouncement.isPending ? 'Sending…' : 'Send'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : tab === 'class-messages' ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Class-Level Message</CardTitle></CardHeader>
            <CardContent>
              <Form {...classMsgForm}>
                <form onSubmit={classMsgForm.handleSubmit(onClassMsg)} className="space-y-4">
                  <FormField control={classMsgForm.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={classMsgForm.control} name="classArmId" render={({ field }) => (
                    <FormItem><FormLabel>Class Arm ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={classMsgForm.control} name="body" render={({ field }) => (
                    <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={sendClassMessage.isPending}>
                      <MessageCircle className="mr-1.5 size-4" /> {sendClassMessage.isPending ? 'Sending…' : 'Send'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div>
            {notifLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
                <Bell className="mb-2 size-8 text-muted-foreground" /> <p className="text-sm text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n: any) => (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-sm truncate font-medium">{n.title ?? n.body?.slice(0, 60)}</TableCell>
                      <TableCell><Badge variant="outline">{n.notificationType}</Badge></TableCell>
                      <TableCell>
                        {n.readAt ? (
                          <Badge variant="neutral" className="gap-1"><Check className="size-3" /> Read</Badge>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => markRead.mutate({ notificationId: n.id })}>Mark read</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
