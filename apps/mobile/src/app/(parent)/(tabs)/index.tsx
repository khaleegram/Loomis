import { useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatKobo } from '@loomis/core';
import { EmptyState, LOOMIS, Skeleton } from '@loomis/ui-mobile';
import { ParentInsightGrid } from '@/components/parent/chrome/parent-insight-grid';
import { ParentScreen } from '@/components/parent/chrome/parent-screen';
import { ParentSectionHeader } from '@/components/parent/chrome/parent-section-header';
import { ParentChildCard } from '@/components/parent/parent-child-card';
import { ParentFeeAlert } from '@/components/parent/parent-fee-alert';
import { useAuth } from '@/lib/auth-context';
import { greetingLine, timeGreeting } from '@/lib/display-name';
import { formatTodayLabel, PARENT_UI } from '@/lib/parent/parent-ui';
import { useParentChildContext } from '@/lib/use-parent-child-context';
import type { ParentChildCardResponse } from '@loomis/contracts';

function attendanceRate(card: ParentChildCardResponse): number | null {
  const { presentCount, totalCount } = card.attendanceSummary;
  if (totalCount <= 0) return null;
  return Math.round((presentCount / totalCount) * 100);
}

export default function ParentHomeScreen() {
  const { session } = useAuth();
  const { cards, isLoading, isRefetching, refetch, setActiveChildKey } = useParentChildContext();

  const avgAttendance = useMemo(() => {
    const rates = cards.map(attendanceRate).filter((v): v is number => v != null);
    if (rates.length === 0) return null;
    return Math.round(rates.reduce((sum, v) => sum + v, 0) / rates.length);
  }, [cards]);

  const totalOutstanding = useMemo(
    () => cards.reduce((sum, c) => sum + c.outstandingBalanceMinor, 0),
    [cards],
  );

  const totalUnread = useMemo(
    () => cards.reduce((sum, c) => sum + c.unreadMessageCount, 0),
    [cards],
  );

  const schoolLabel = cards[0]?.schoolName ?? 'Family Portal';

  function focusChild(card: ParentChildCardResponse) {
    setActiveChildKey(`${card.tenantId}:${card.studentId}`);
  }

  const insights = [
    {
      id: 'children',
      label: 'Children',
      value: String(cards.length),
      icon: 'people-outline' as const,
      tone: 'brand' as const,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      value: avgAttendance != null ? `${avgAttendance}%` : '—',
      icon: 'checkmark-circle-outline' as const,
      tone: 'green' as const,
    },
    {
      id: 'fees',
      label: 'Due',
      value: totalOutstanding > 0 ? formatKobo(totalOutstanding) : 'Clear',
      icon: 'wallet-outline' as const,
      tone: totalOutstanding > 0 ? ('gold' as const) : ('neutral' as const),
    },
    {
      id: 'messages',
      label: 'Unread',
      value: totalUnread > 0 ? String(totalUnread) : 'None',
      icon: 'chatbubble-outline' as const,
      tone: totalUnread > 0 ? ('brand' as const) : ('neutral' as const),
    },
  ];

  return (
    <ParentScreen
      islandLabel={schoolLabel}
      unreadCount={totalUnread}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={LOOMIS.brand[600]}
          />
        ),
      }}
    >
      <View className="px-5 pb-1 pt-3">
        <Text style={{ ...PARENT_UI.section, color: LOOMIS.brand[600] }}>
          {timeGreeting().toUpperCase()}
        </Text>
        <Text style={{ ...PARENT_UI.display, marginTop: 6 }}>{greetingLine(session?.displayName)}</Text>
        <Text style={{ ...PARENT_UI.body, marginTop: 8 }}>{formatTodayLabel()}</Text>
      </View>

      {!isLoading && totalOutstanding > 0 ? (
        <ParentFeeAlert
          amountMinor={totalOutstanding}
          onPress={() => {
            const card = cards.find((c) => c.outstandingBalanceMinor > 0);
            if (card) {
              focusChild(card);
              router.push('/(parent)/(tabs)/fees');
            }
          }}
        />
      ) : null}

      {!isLoading ? <ParentInsightGrid metrics={insights} /> : null}

      <View className="mt-8 px-5">
        <ParentSectionHeader
          eyebrow="Linked children"
          title="Your family"
          trailing={!isLoading && cards.length > 0 ? `${cards.length} active` : undefined}
        />

        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-3xl" />
        ) : cards.length > 0 ? (
          <View className="gap-4">
            {cards.map((card) => (
              <ParentChildCard
                key={card.id}
                card={card}
                onPress={() => {
                  focusChild(card);
                  router.push('/(parent)/(tabs)/academics');
                }}
                onAttendance={() => {
                  focusChild(card);
                  router.push('/(parent)/(tabs)/academics?tab=attendance');
                }}
                onResults={() => {
                  focusChild(card);
                  router.push('/(parent)/(tabs)/academics?tab=results');
                }}
                onPayFees={() => {
                  focusChild(card);
                  router.push('/(parent)/(tabs)/fees');
                }}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No linked children"
            description="Ask your school administrator to link your parent account."
          />
        )}
      </View>
    </ParentScreen>
  );
}
