import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';
import { EmptyState } from '../primitives/EmptyState.js';
import { Skeleton } from '../primitives/Skeleton.js';

export interface SchedulePeriod {
  id: string;
  subject: string;
  teacher?: string;
  room?: string;
  startTime: string;
  endTime: string;
}

export interface DayScheduleProps {
  days: { id: string; label: string; periods: SchedulePeriod[] }[];
  loading?: boolean;
}

export function DaySchedule({ days, loading }: DayScheduleProps) {
  const [activeDay, setActiveDay] = useState(days[0]?.id ?? '');

  if (loading) {
    return (
      <View className="gap-3 px-5 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </View>
    );
  }

  if (days.length === 0) {
    return <EmptyState title="No timetable" description="Your schedule will appear when published." />;
  }

  const active = days.find((d) => d.id === activeDay) ?? days[0]!;

  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 py-3"
      >
        {days.map((day) => (
          <Pressable
            key={day.id}
            onPress={() => setActiveDay(day.id)}
            className={cn(
              'min-h-[44px] rounded-xl px-4 py-2',
              day.id === active.id ? 'bg-brand-500' : 'bg-white',
            )}
          >
            <Text
              className={cn(
                'text-sm font-semibold',
                day.id === active.id ? 'text-neutral-900' : 'text-neutral-700',
              )}
            >
              {day.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView className="flex-1 px-5" contentContainerClassName="gap-3 pb-8">
        {active.periods.length === 0 ? (
          <EmptyState title="No classes" description="Nothing scheduled for this day." />
        ) : (
          active.periods.map((period) => (
            <View
              key={period.id}
              className="rounded-2xl border border-brand-100/40 bg-white p-4"
            >
              <Text className={MOBILE_THEME.sectionLabel}>
                {period.startTime} – {period.endTime}
              </Text>
              <Text className="mt-1 text-base font-bold text-neutral-900">
                {period.subject}
              </Text>
              {period.teacher ? (
                <Text className="mt-1 text-sm text-neutral-500">{period.teacher}</Text>
              ) : null}
              {period.room ? (
                <Text className="text-sm text-neutral-500">Room {period.room}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
