import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ChildAttendanceResponse } from '@loomis/contracts';
import { EmptyState, LOOMIS, Skeleton } from '@loomis/ui-mobile';
import { parentScrollBottomPadding } from '@/components/parent/chrome/constants';
import { PARENT_UI } from '@/lib/parent/parent-ui';
import {
  attendanceRatePercent,
  formatAttendanceStatus,
  monthSectionLabel,
  shortDateLabel,
} from '@/lib/parent/labels';

const STATUS_COLORS: Record<string, string> = {
  present: LOOMIS.success,
  absent: '#dc2626',
  late: '#d97706',
  excused: LOOMIS.brand[600],
};

interface ParentAttendancePanelProps {
  query: UseQueryResult<ChildAttendanceResponse>;
  termLabel: string | null;
  classArmLabel?: string | null;
  loading: boolean;
}

export function ParentAttendancePanel({
  query,
  termLabel,
  classArmLabel,
  loading,
}: ParentAttendancePanelProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = parentScrollBottomPadding(insets.bottom);

  const summary = query.data?.summary ?? { present: 0, absent: 0, late: 0, excused: 0 };
  const rate = attendanceRatePercent(summary);
  const totalDays = summary.present + summary.absent + summary.late + summary.excused;
  const resolvedClassArm = classArmLabel ?? query.data?.classArmLabel ?? null;
  const progressColor = rate >= 90 ? LOOMIS.success : rate >= 75 ? LOOMIS.brand[600] : '#d97706';

  const sections = useMemo(() => {
    const records = query.data?.records ?? [];
    const grouped = new Map<string, typeof records>();
    for (const record of records) {
      const month = record.attendanceDate.slice(0, 7);
      const list = grouped.get(month) ?? [];
      list.push(record);
      grouped.set(month, list);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => ({
        id: month,
        title: monthSectionLabel(month),
        items: [...items].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
      }));
  }, [query.data?.records]);

  const isLoading = loading || query.isLoading;

  if (isLoading) {
    return (
      <View className="gap-3 px-5 pt-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title="Could not load attendance"
        description="Pull down to refresh and try again."
        className="pt-8"
      />
    );
  }

  const stats = [
    { label: 'Present', value: String(summary.present), sub: `${summary.late} late` },
    { label: 'Absent', value: String(summary.absent), sub: `${summary.excused} excused` },
    { label: 'Logged', value: String(totalDays), sub: termLabel ?? 'This term' },
    { label: 'Rate', value: `${rate}%`, sub: 'Present + late', accent: LOOMIS.brand[600] },
  ];

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPad, paddingTop: 8 }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={LOOMIS.brand[600]}
        />
      }
    >
      <View className="mx-5">
        <View
          style={{
            borderRadius: 20,
            backgroundColor: '#fff',
            overflow: 'hidden',
            ...PARENT_UI.border,
            ...PARENT_UI.card,
          }}
        >
          <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}>
            <View className="flex-row items-end justify-between">
              <View className="flex-1 pr-3">
                <Text style={PARENT_UI.section}>Term attendance</Text>
                <Text style={{ ...PARENT_UI.title, fontSize: 34, marginTop: 4 }}>{rate}%</Text>
                <Text style={{ ...PARENT_UI.body, fontSize: 13, marginTop: 4 }}>
                  {summary.present + summary.late} of {totalDays} days present or late
                </Text>
              </View>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 4,
                  borderColor: progressColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${progressColor}12`,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: progressColor }}>
                  {rate}%
                </Text>
              </View>
            </View>

            {resolvedClassArm || termLabel ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {resolvedClassArm ? <MetaPill label={resolvedClassArm} /> : null}
                {termLabel ? <MetaPill label={termLabel} muted /> : null}
              </View>
            ) : null}

            {totalDays > 0 ? (
              <View className="mt-4 flex-row items-center gap-2">
                <View className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.max(rate, 4)}%`,
                      borderRadius: 999,
                      backgroundColor: progressColor,
                    }}
                  />
                </View>
                <Ionicons name="trending-up-outline" size={16} color={LOOMIS.brand[600]} />
              </View>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderTopColor: 'rgba(201,169,110,0.15)',
            }}
          >
            {stats.map((stat, index) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  borderRightWidth: index < stats.length - 1 ? 1 : 0,
                  borderRightColor: 'rgba(201,169,110,0.12)',
                }}
              >
                <Text style={{ ...PARENT_UI.section, fontSize: 9 }}>{stat.label}</Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 17,
                    fontWeight: '800',
                    color: stat.accent ?? LOOMIS.neutral[900],
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{ marginTop: 2, fontSize: 10, color: LOOMIS.neutral[500] }}
                  numberOfLines={1}
                >
                  {stat.sub}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {sections.length === 0 ? (
        <EmptyState
          title="No attendance yet"
          description="Records appear after your class teacher marks attendance for this term."
          className="pt-8"
        />
      ) : (
        <View className="mt-5 gap-4 px-5">
          {sections.map((section) => (
            <View key={section.id}>
              <Text style={{ ...PARENT_UI.section, marginBottom: 8 }}>{section.title}</Text>
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: '#fff',
                  ...PARENT_UI.border,
                  ...PARENT_UI.card,
                }}
              >
                {section.items.map((record, index) => {
                  const accent = STATUS_COLORS[record.status] ?? LOOMIS.neutral[400];
                  return (
                    <View
                      key={record.id}
                      className="flex-row items-center gap-3 px-4 py-3"
                      style={
                        index < section.items.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,110,0.1)' }
                          : undefined
                      }
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: accent,
                        }}
                      />
                      <View className="flex-1">
                        <Text style={{ fontSize: 14, fontWeight: '700', color: LOOMIS.neutral[900] }}>
                          {shortDateLabel(record.attendanceDate)}
                        </Text>
                      </View>
                      <View
                        style={{
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor: `${accent}15`,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>
                          {formatAttendanceStatus(record.status)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MetaPill({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: muted ? '#f8fafc' : LOOMIS.brand[50],
        borderWidth: 1,
        borderColor: muted ? 'rgba(0,0,0,0.06)' : 'rgba(201,169,110,0.3)',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: muted ? LOOMIS.neutral[500] : LOOMIS.brand[800],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
