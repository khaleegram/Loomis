import { Text, View } from 'react-native';
import { PARENT_UI } from '@/lib/parent/parent-ui';

interface ParentSectionHeaderProps {
  eyebrow: string;
  title: string;
  trailing?: string;
}

export function ParentSectionHeader({ eyebrow, title, trailing }: ParentSectionHeaderProps) {
  return (
    <View className="mb-4 flex-row items-end justify-between">
      <View>
        <Text style={PARENT_UI.section}>{eyebrow}</Text>
        <Text style={{ ...PARENT_UI.title, marginTop: 4 }}>{title}</Text>
      </View>
      {trailing ? <Text style={PARENT_UI.caption}>{trailing}</Text> : null}
    </View>
  );
}
