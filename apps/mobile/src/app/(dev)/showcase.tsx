import { ScrollView, Text, View } from 'react-native';
import {
  AuthShell,
  Button,
  HomeHub,
  TimelineList,
  SummaryDetail,
  DaySchedule,
  QuickMarkGrid,
  OfflineBanner,
  SettingsFormShell,
  SubmissionFlow,
} from '@loomis/ui-mobile';

export default function ShowcaseScreen() {
  if (!__DEV__) return null;

  return (
    <ScrollView className="flex-1 bg-neutral-50 dark:bg-forest-950">
      <Text className="px-5 py-6 text-2xl font-extrabold text-neutral-900">Layout catalog</Text>
      <OfflineBanner pendingCount={2} lastSyncLabel="10:42" />
      <View className="h-[420px]">
        <HomeHub
          consoleLabel="Preview"
          userName="Ada"
          description="HomeHub archetype"
          statChips={[
            { id: '1', label: 'Children', value: '2' },
            { id: '2', label: 'Fees', value: '₦0' },
          ]}
          actions={[
            { id: 'a', label: 'Attendance' },
            { id: 'b', label: 'Results' },
          ]}
        />
      </View>
      <View className="h-64 px-5">
        <TimelineList
          sections={[
            {
              id: 'w1',
              title: 'Week 1',
              items: [{ id: '1', label: 'Mon', meta: 'present', status: 'present' }],
            },
          ]}
        />
      </View>
      <View className="px-5 pb-12">
        <SummaryDetail
          title="Results preview"
          summaryLabel="Average"
          summaryValue="78%"
          rows={[{ id: '1', label: 'Math', value: '80%' }]}
        />
        <View className="mt-6 h-72">
          <DaySchedule
            days={[
              {
                id: '1',
                label: 'Mon',
                periods: [
                  {
                    id: 'p1',
                    subject: 'English',
                    startTime: '08:00',
                    endTime: '09:00',
                  },
                ],
              },
            ]}
          />
        </View>
        <View className="mt-6 h-80">
          <SubmissionFlow
            items={[
              {
                id: '1',
                title: 'Essay draft',
                dueLabel: 'Due Mon',
                statusLabel: 'Not submitted',
              },
            ]}
            selectedId="1"
            onSelect={() => undefined}
            onSubmit={() => undefined}
          />
        </View>
        <View className="mt-6 h-80">
          <QuickMarkGrid
            students={[{ id: '1', name: 'Student A', status: null }]}
            dateLabel="Today"
            onMark={() => undefined}
            onSubmit={() => undefined}
          />
        </View>
        <SettingsFormShell title="SettingsForm" footer={<Button>Save</Button>}>
          <Text className="text-sm text-neutral-600">Form body preview</Text>
        </SettingsFormShell>
        <View className="mt-6 h-96">
          <AuthShell title="AuthShell" subtitle="Branded auth layout">
            <Button>Sign in</Button>
          </AuthShell>
        </View>
      </View>
    </ScrollView>
  );
}
