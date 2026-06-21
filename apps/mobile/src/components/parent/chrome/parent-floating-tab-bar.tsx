import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOOMIS } from '@loomis/ui-mobile';
import { PARENT_FLOATING_TAB_MARGIN } from './constants';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

export interface FloatingTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  navigation: {
    emit: (event: Record<string, unknown>) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

const TAB_ICONS: Record<string, { icon: TabIconName; iconActive: TabIconName }> = {
  index: { icon: 'home-outline', iconActive: 'home' },
  academics: { icon: 'book-outline', iconActive: 'book' },
  fees: { icon: 'wallet-outline', iconActive: 'wallet' },
  messages: { icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  settings: { icon: 'person-outline', iconActive: 'person' },
};

export function ParentFloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: Math.max(insets.bottom, 8) + PARENT_FLOATING_TAB_MARGIN,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          backgroundColor: '#ffffff',
          borderRadius: 32,
          paddingHorizontal: 10,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: 'rgba(201, 169, 110, 0.2)',
          shadowColor: '#3d3428',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.14,
          shadowRadius: 28,
          elevation: 14,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_ICONS[route.name] ?? { icon: 'ellipse-outline', iconActive: 'ellipse' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: focused ? '#c9a96e' : 'transparent',
              }}
            >
              <Ionicons
                name={focused ? meta.iconActive : meta.icon}
                size={23}
                color={focused ? LOOMIS.neutral[900] : LOOMIS.neutral[400]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
