'use client';

import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@loomis/ui-web';

import { classArmOptions } from '@/lib/academic/use-academic-ops-context';

interface AcademicTermSelectorsProps {
  years: AcademicYearResponse[];
  terms: AcademicTermResponse[];
  classArmOptions: ReturnType<typeof classArmOptions>;
  yearId: string | null;
  termId: string | null;
  classArmId: string | null;
  onYearChange: (id: string) => void;
  onTermChange: (id: string) => void;
  onClassArmChange: (id: string) => void;
  showClassArm?: boolean;
}

export function AcademicTermSelectors({
  years,
  terms,
  classArmOptions: armOptions,
  yearId,
  termId,
  classArmId,
  onYearChange,
  onTermChange,
  onClassArmChange,
  showClassArm = true,
}: AcademicTermSelectorsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label>Academic year</Label>
        <Select value={yearId ?? undefined} onValueChange={onYearChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Term</Label>
        <Select value={termId ?? undefined} onValueChange={onTermChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {term.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showClassArm ? (
        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={classArmId ?? undefined} onValueChange={onClassArmChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {armOptions.map((arm) => (
                <SelectItem key={arm.id} value={arm.id}>
                  {arm.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
