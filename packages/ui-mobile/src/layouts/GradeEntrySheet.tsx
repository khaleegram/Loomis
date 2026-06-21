import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../primitives/Button.js';
import { Input } from '../primitives/Input.js';
import { Label } from '../primitives/Label.js';
import { Sheet } from '../primitives/Sheet.js';

export interface GradeEntrySheetProps {
  visible: boolean;
  studentName: string;
  componentLabel: string;
  maxScore: number;
  initialScore?: string;
  onClose: () => void;
  onSave: (score: number) => void;
  saving?: boolean;
}

export function GradeEntrySheet({
  visible,
  studentName,
  componentLabel,
  maxScore,
  initialScore = '',
  onClose,
  onSave,
  saving,
}: GradeEntrySheetProps) {
  const [score, setScore] = useState(initialScore);

  return (
    <Sheet visible={visible} onClose={onClose} title="Enter score">
      <Text className="mb-1 text-sm font-semibold text-neutral-900">
        {studentName}
      </Text>
      <Text className="mb-4 text-xs text-neutral-500">{componentLabel} · Max {maxScore}</Text>
      <Label>Score</Label>
      <Input
        value={score}
        onChangeText={setScore}
        keyboardType="numeric"
        placeholder={`0 – ${maxScore}`}
      />
      <View className="mt-6 flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          loading={saving ?? false}
          onPress={() => {
            const parsed = Number(score);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > maxScore) return;
            onSave(parsed);
          }}
        >
          Save draft
        </Button>
      </View>
    </Sheet>
  );
}
