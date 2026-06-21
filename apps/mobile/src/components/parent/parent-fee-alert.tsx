import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatKobo } from '@loomis/core';
import { LOOMIS } from '@loomis/ui-mobile';
import { PARENT_UI } from '@/lib/parent/parent-ui';

interface ParentFeeAlertProps {
  amountMinor: number;
  onPress: () => void;
}

export function ParentFeeAlert({ amountMinor, onPress }: ParentFeeAlertProps) {
  if (amountMinor <= 0) return null;

  return (
    <Pressable
      onPress={onPress}
      className="mx-5 mb-2 mt-1 active:opacity-95"
      style={{
        borderRadius: 18,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: 'rgba(217, 119, 6, 0.25)',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...PARENT_UI.card,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: 'rgba(217, 119, 6, 0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="wallet" size={22} color={LOOMIS.gold} />
      </View>
      <View className="min-w-0 flex-1">
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400e' }}>Fees outstanding</Text>
        <Text style={{ marginTop: 2, fontSize: 18, fontWeight: '800', color: LOOMIS.neutral[900] }}>
          {formatKobo(amountMinor)}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: '#c9a96e',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={PARENT_UI.ctaText}>Pay</Text>
      </View>
    </Pressable>
  );
}
