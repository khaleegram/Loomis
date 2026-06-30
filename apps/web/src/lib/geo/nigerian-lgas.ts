import type { SmartSearchOption } from '@loomis/ui-web';

import lgaData from './nigerian-lgas.json';
import type { NigerianState } from './nigerian-states';

/** Dataset keys that differ from our canonical state labels. */
const STATE_LGA_KEY: Partial<Record<NigerianState, string>> = {
  FCT: 'Federal Capital Territory',
  Nasarawa: 'Nassarawa',
};

const lgaRecord = lgaData as Record<string, string[]>;

export function getLgasForState(state: string): string[] {
  if (!state) return [];
  const key = (STATE_LGA_KEY[state as NigerianState] ?? state) as string;
  return lgaRecord[key] ?? [];
}

export function getLgaOptionsForState(state: string): SmartSearchOption[] {
  return getLgasForState(state).map((lga) => ({
    value: lga,
    label: lga,
  }));
}
