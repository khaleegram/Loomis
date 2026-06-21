import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LOOMIS } from '@loomis/ui-mobile';
import type { ParentChildCardResponse } from '@loomis/contracts';
import { PARENT_UI, studentDisplayName } from '@/lib/parent/parent-ui';

interface ChildOption {
  id: string;
  label: string;
  subtitle?: string;
  card: ParentChildCardResponse;
}

interface TermOption {
  id: string;
  label: string;
}

interface ParentAcademicsContextBarProps {
  childOptions: ChildOption[];
  activeChildKey: string | null;
  onSelectChild: (key: string) => void;
  activeCard: ParentChildCardResponse;
  terms: TermOption[];
  termId: string | null;
  onSelectTerm: (termId: string) => void;
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'S';
}

export function ParentAcademicsContextBar({
  childOptions,
  activeChildKey,
  onSelectChild,
  activeCard,
  terms,
  termId,
  onSelectTerm,
}: ParentAcademicsContextBarProps) {
  const displayName = studentDisplayName(activeCard);
  const multipleChildren = childOptions.length > 1;

  return (
    <View style={{ flexGrow: 0 }}>
      {multipleChildren ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, maxHeight: 52 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            gap: 8,
            alignItems: 'center',
          }}
        >
          {childOptions.map((child) => {
            const active = child.id === activeChildKey;
            return (
              <Pressable
                key={child.id}
                onPress={() => onSelectChild(child.id)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: active ? LOOMIS.brand[600] : '#fff',
                  borderWidth: 1,
                  borderColor: active ? LOOMIS.brand[600] : 'rgba(201,169,110,0.25)',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: active ? '#fff' : LOOMIS.neutral[700],
                  }}
                >
                  {child.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 8,
            marginBottom: 4,
            borderRadius: 18,
            backgroundColor: '#fff',
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            ...PARENT_UI.border,
            ...PARENT_UI.card,
          }}
        >
          <LinearGradient
            colors={LOOMIS.gradients.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
              {initial(displayName)}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={PARENT_UI.section} numberOfLines={1}>
              {activeCard.schoolName}
            </Text>
            <Text
              style={{ ...PARENT_UI.title, fontSize: 17, marginTop: 2 }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>
          {activeCard.classArmLabel ? (
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: LOOMIS.brand[50],
                borderWidth: 1,
                borderColor: 'rgba(201,169,110,0.3)',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: LOOMIS.brand[800] }}>
                {activeCard.classArmLabel}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {terms.length > 0 ? (
        <View style={{ paddingTop: 6, paddingBottom: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, maxHeight: 48 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...PARENT_UI.section, marginRight: 4 }}>Term</Text>
            {terms.map((term) => {
              const active = term.id === termId;
              return (
                <Pressable
                  key={term.id}
                  onPress={() => onSelectTerm(term.id)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    backgroundColor: active ? LOOMIS.brand[600] : '#fff',
                    borderWidth: 1,
                    borderColor: active ? LOOMIS.brand[600] : 'rgba(201,169,110,0.25)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? '#fff' : LOOMIS.neutral[700],
                    }}
                  >
                    {term.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
