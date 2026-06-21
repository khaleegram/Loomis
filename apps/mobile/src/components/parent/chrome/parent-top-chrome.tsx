import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOOMIS } from '@loomis/ui-mobile';
import { shortenSchoolName } from '@/lib/parent/parent-ui';

interface ParentTopChromeProps {
  islandLabel?: string;
  unreadCount?: number;
}

export function ParentTopChrome({ islandLabel = 'Family Portal', unreadCount = 0 }: ParentTopChromeProps) {
  const insets = useSafeAreaInsets();
  const label = shortenSchoolName(islandLabel);

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 10), paddingBottom: 10 }}
      className="border-b border-brand-100/30 bg-neutral-50 px-5"
    >
      <View className="flex-row items-center justify-between">
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: LOOMIS.brand[600],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="heart" size={19} color="#fff" />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 999,
            paddingHorizontal: 18,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: 'rgba(201, 169, 110, 0.3)',
            shadowColor: LOOMIS.brand[800],
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.07,
            shadowRadius: 10,
            elevation: 3,
            maxWidth: '56%',
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: LOOMIS.success,
              marginRight: 8,
            }}
          />
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, fontWeight: '700', color: LOOMIS.neutral[700] }}
          >
            {label}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(parent)/(tabs)/messages')}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: pressed ? LOOMIS.brand[50] : '#ffffff',
            borderWidth: 1,
            borderColor: 'rgba(201, 169, 110, 0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="notifications-outline" size={21} color={LOOMIS.brand[700]} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                minWidth: 17,
                height: 17,
                borderRadius: 9,
                backgroundColor: LOOMIS.gold,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                borderWidth: 2,
                borderColor: '#fff',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
