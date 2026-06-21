import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOOMIS } from '@loomis/ui-mobile';
import { PARENT_UI } from '@/lib/parent/parent-ui';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

export interface InsightMetric {
  id: string;
  label: string;
  value: string;
  icon: TabIconName;
  tone?: 'brand' | 'green' | 'gold' | 'neutral';
}

export function ParentInsightGrid({ metrics }: { metrics: InsightMetric[] }) {
  return (
    <View className="mx-5 mt-4 flex-row flex-wrap gap-3">
      {metrics.map((metric) => (
        <InsightTile key={metric.id} metric={metric} />
      ))}
    </View>
  );
}

function InsightTile({ metric }: { metric: InsightMetric }) {
  const tone = metric.tone ?? 'brand';
  const accent =
    tone === 'green'
      ? LOOMIS.success
      : tone === 'gold'
        ? LOOMIS.gold
        : tone === 'neutral'
          ? LOOMIS.neutral[500]
          : LOOMIS.brand[600];

  return (
    <View
      style={{
        width: '47%',
        flexGrow: 1,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        ...PARENT_UI.border,
        ...PARENT_UI.card,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: `${accent}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={metric.icon} size={17} color={accent} />
      </View>
      <Text style={PARENT_UI.section}>{metric.label}</Text>
      <Text
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.5,
          color: LOOMIS.neutral[900],
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {metric.value}
      </Text>
    </View>
  );
}
