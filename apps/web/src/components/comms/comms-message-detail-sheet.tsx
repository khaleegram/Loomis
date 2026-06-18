'use client';

import type { NotificationResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@loomis/ui-web';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

import {
  useMarkNotificationRead,
  useMessage,
  useMessageThread,
  useReplyToMessage,
} from '@loomis/api-client';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatNotificationType } from '@/lib/comms/comms-labels';

export interface CommsNotificationContext extends NotificationResponse {
  tenantId: string;
  schoolName?: string | null;
}

interface CommsMessageDetailSheetProps {
  notification: CommsNotificationContext | null;
  onClose: () => void;
  allowParentReply?: boolean;
  showThread?: boolean;
}

export function CommsMessageDetailSheet({
  notification,
  onClose,
  allowParentReply = false,
  showThread = false,
}: CommsMessageDetailSheetProps) {
  const tenantId = notification?.tenantId ?? '';
  const messageId = notification?.messageId ?? null;
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const markRead = useMarkNotificationRead(tenantId);
  const replyMutation = useReplyToMessage(tenantId);
  const messageQuery = useMessage(tenantId, messageId);
  const threadQuery = useMessageThread(
    tenantId,
    showThread && messageQuery.data?.threadId ? messageQuery.data.threadId : null,
  );

  const canReply =
    allowParentReply && notification?.notificationType === 'class_message' && Boolean(messageId);

  useEffect(() => {
    setReply('');
    setError(null);
  }, [notification?.id]);

  useEffect(() => {
    if (!notification || notification.readAt) return;
    void markRead.mutateAsync({ notificationId: notification.id }).catch(() => undefined);
  }, [notification?.id, notification?.readAt, markRead]);

  async function sendReply() {
    if (!messageId || !reply.trim()) return;
    setError(null);
    try {
      await replyMutation.mutateAsync({ messageId, body: reply.trim() });
      setReply('');
      onClose();
    } catch {
      setError('Reply failed. You can only reply to direct class messages sent to you.');
    }
  }

  const body = messageQuery.data?.body ?? notification?.body ?? '';
  const threadMessages = threadQuery.data?.messages ?? [];

  return (
    <Sheet open={Boolean(notification)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        {notification ? (
          <>
            <SheetHeader>
              <SheetTitle>{notification.title}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    {formatNotificationType(notification.notificationType)}
                  </span>
                  {notification.schoolName ? (
                    <span className="text-[11px] font-medium text-neutral-500">
                      {notification.schoolName}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-neutral-400">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-neutral-800">{body}</p>

              {showThread && threadMessages.length > 1 ? (
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    Conversation
                  </p>
                  {threadMessages.map((message) => (
                    <div key={message.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                        {message.messageType === 'parent_reply' ? 'Parent reply' : message.senderRole}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] text-neutral-800">
                        {message.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {canReply ? (
                <div className="space-y-2">
                  <Label htmlFor="inbox-reply" className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">
                    Reply to class teacher
                  </Label>
                  <Textarea
                    id="inbox-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Write your reply…"
                    rows={4}
                  />
                  {error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : allowParentReply ? (
                <Alert>
                  <AlertDescription>
                    You can reply only to direct class messages from your child&apos;s teacher.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            {canReply ? (
              <SheetFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  className={ACADEMIC_UI.btnPrimary}
                  disabled={!reply.trim()}
                  onClick={() => void sendReply()}
                >
                  {replyMutation.isPending ? 'Sending…' : 'Send reply'}
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
