import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  useMarkNotificationRead,
  useMessage,
  useNotifications,
  useReplyToMessage,
} from '@loomis/api-client';
import type { NotificationResponse } from '@loomis/contracts';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Sheet,
  Skeleton,
} from '@loomis/ui-mobile';
import { ParentScopedScreen } from '@/components/parent/parent-scoped-screen';

export default function ParentMessagesScreen() {
  return (
    <ParentScopedScreen>
      {({ tenantId }) => <MessagesPanel tenantId={tenantId} />}
    </ParentScopedScreen>
  );
}

function MessagesPanel({ tenantId }: { tenantId: string }) {
  const notificationsQuery = useNotifications(tenantId);
  const notifications = notificationsQuery.data?.notifications ?? [];
  const [selected, setSelected] = useState<NotificationResponse | null>(null);

  if (notificationsQuery.isLoading) {
    return (
      <View className="gap-3 px-5 pt-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        title="No messages"
        description="Announcements and class updates from your child's school will appear here."
      />
    );
  }

  return (
    <>
      <FlashList
        data={notifications}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            className="mb-3 active:opacity-90"
          >
            <Card className={item.readAt ? 'opacity-80' : 'border-brand-200/60'}>
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-sm font-bold text-neutral-900 dark:text-neutral-50">
                  {item.title}
                </Text>
                {!item.readAt ? (
                  <View className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                ) : null}
              </View>
              <Text className="mt-1 text-xs text-neutral-600 dark:text-neutral-300" numberOfLines={2}>
                {item.body}
              </Text>
              <Text className="mt-2 text-[10px] text-neutral-400">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Card>
          </Pressable>
        )}
      />
      <NotificationSheet
        tenantId={tenantId}
        notification={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function NotificationSheet({
  tenantId,
  notification,
  onClose,
}: {
  tenantId: string;
  notification: NotificationResponse | null;
  onClose: () => void;
}) {
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const markRead = useMarkNotificationRead(tenantId);
  const replyMutation = useReplyToMessage(tenantId);
  const messageId = notification?.messageId ?? null;
  const messageQuery = useMessage(tenantId, messageId);

  const canReply =
    notification?.notificationType === 'class_message' && Boolean(messageId);

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
      setError('Reply failed. You can only reply to messages sent to you.');
    }
  }

  return (
    <Sheet visible={Boolean(notification)} onClose={onClose} title={notification?.title}>
      {notification ? (
        <View>
          <Text className="text-sm leading-5 text-neutral-700 dark:text-neutral-200">
            {messageQuery.data?.body ?? notification.body}
          </Text>
          <Text className="mt-3 text-[10px] text-neutral-400">
            {new Date(notification.createdAt).toLocaleString()}
          </Text>

          {canReply ? (
            <View className="mt-6">
              <Text className="mb-2 text-xs font-semibold text-neutral-600">Reply to class teacher</Text>
              <Input
                value={reply}
                onChangeText={setReply}
                placeholder="Write your reply…"
              />
              {error ? (
                <Alert tone="danger" className="mt-3">
                  {error}
                </Alert>
              ) : null}
              <Button
                className="mt-4"
                loading={replyMutation.isPending}
                disabled={!reply.trim()}
                onPress={() => void sendReply()}
              >
                Send reply
              </Button>
            </View>
          ) : (
            <Alert tone="info" className="mt-4">
              You can reply only to direct class messages from your child's teacher.
            </Alert>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
