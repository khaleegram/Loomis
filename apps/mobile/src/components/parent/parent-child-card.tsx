import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatKobo } from '@loomis/core';
import type { ParentChildCardResponse } from '@loomis/contracts';
import { LOOMIS } from '@loomis/ui-mobile';
import { PARENT_UI, studentDisplayName } from '@/lib/parent/parent-ui';

function pct(card: ParentChildCardResponse): string {
  const { presentCount, totalCount } = card.attendanceSummary;
  if (totalCount <= 0) return '—';
  return `${Math.round((presentCount / totalCount) * 100)}%`;
}

function avg(card: ParentChildCardResponse): string {
  const s = card.latestResultSummary?.averageScore;
  return s == null ? '—' : `${Math.round(s)}%`;
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'S';
}

export interface ParentChildCardProps {
  card: ParentChildCardResponse;
  onPress?: () => void;
  onPayFees?: () => void;
  onAttendance?: () => void;
  onResults?: () => void;
}

export function ParentChildCard({
  card,
  onPress,
  onPayFees,
  onAttendance,
  onResults,
}: ParentChildCardProps) {
  const due = card.outstandingBalanceMinor > 0;
  const displayName = studentDisplayName(card);

  return (
    <Pressable onPress={onPress} className="active:scale-[0.99]">
      <View
        style={{
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: '#fff',
          ...PARENT_UI.border,
          ...PARENT_UI.cardLg,
        }}
      >
        <LinearGradient
          colors={['#f5efe6', '#faf7f2', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}
        >
          <View className="flex-row items-center gap-3.5">
            <LinearGradient
              colors={LOOMIS.gradients.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>
                {initial(displayName)}
              </Text>
            </LinearGradient>

            <View className="min-w-0 flex-1">
              <Text style={PARENT_UI.section}>{card.schoolName}</Text>
              <Text style={{ ...PARENT_UI.title, marginTop: 2, fontSize: 21 }}>{displayName}</Text>
              {card.classArmLabel ? (
                <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-brand-100 px-2.5 py-1">
                  <Ionicons name="school-outline" size={12} color={LOOMIS.brand[700]} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: LOOMIS.brand[800] }}>
                    {card.classArmLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="h-9 w-9 items-center justify-center rounded-full bg-white/80">
              <Ionicons name="chevron-forward" size={18} color={LOOMIS.brand[600]} />
            </View>
          </View>
        </LinearGradient>

        <View className="flex-row border-t border-brand-100/50 bg-white px-1">
          <StatCell label="Attendance" value={pct(card)} />
          <Divider />
          <StatCell label="Average" value={avg(card)} />
          <Divider />
          <StatCell
            label="Fees"
            value={due ? formatKobo(card.outstandingBalanceMinor) : 'Clear'}
            highlight={due}
          />
        </View>

        <View className="flex-row gap-2 border-t border-brand-100/40 bg-brand-50/40 px-3 py-3">
          <MiniAction icon="calendar-outline" label="Attendance" onPress={onAttendance} />
          <MiniAction icon="ribbon-outline" label="Results" onPress={onResults} />
          {due ? (
            <MiniAction icon="card-outline" label="Pay" onPress={onPayFees} primary />
          ) : (
            <MiniAction icon="open-outline" label="Open" onPress={onPress} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={{ width: 1, backgroundColor: LOOMIS.brand[100], marginVertical: 14 }} />;
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 }}>
      <Text style={PARENT_UI.section}>{label}</Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: 14,
          fontWeight: '800',
          color: highlight ? LOOMIS.gold : LOOMIS.neutral[900],
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function MiniAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[42px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl active:opacity-90"
      style={
        primary
          ? { backgroundColor: '#c9a96e' }
          : { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(201, 169, 110, 0.28)' }
      }
    >
      <Ionicons name={icon} size={14} color={primary ? LOOMIS.neutral[900] : LOOMIS.brand[700]} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: primary ? LOOMIS.neutral[900] : LOOMIS.brand[800],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
