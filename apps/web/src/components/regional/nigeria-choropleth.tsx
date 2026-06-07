'use client';

import { useMemo, useState } from 'react';
import { cn } from '@loomis/ui-web';

/** Simplified Nigeria state paths (viewBox 0 0 500 520) — stylized choropleth. */
const STATE_PATHS: { id: string; name: string; d: string }[] = [
  { id: 'NG-LA', name: 'Lagos', d: 'M 95 380 L 115 375 L 120 395 L 100 400 Z' },
  { id: 'NG-OG', name: 'Ogun', d: 'M 115 375 L 145 370 L 150 390 L 120 395 Z' },
  { id: 'NG-OY', name: 'Oyo', d: 'M 145 370 L 175 360 L 180 385 L 150 390 Z' },
  { id: 'NG-OS', name: 'Osun', d: 'M 175 360 L 200 355 L 205 380 L 180 385 Z' },
  { id: 'NG-EK', name: 'Ekiti', d: 'M 200 355 L 220 348 L 225 372 L 205 380 Z' },
  { id: 'NG-ON', name: 'Ondo', d: 'M 175 385 L 210 378 L 215 405 L 180 410 Z' },
  { id: 'NG-KW', name: 'Kwara', d: 'M 220 348 L 250 340 L 255 365 L 225 372 Z' },
  { id: 'NG-KO', name: 'Kogi', d: 'M 250 340 L 280 335 L 285 360 L 255 365 Z' },
  { id: 'NG-NA', name: 'Nasarawa', d: 'M 280 335 L 305 325 L 310 350 L 285 360 Z' },
  { id: 'NG-FC', name: 'FCT', d: 'M 265 320 L 280 315 L 285 330 L 270 335 Z' },
  { id: 'NG-NI', name: 'Niger', d: 'M 220 320 L 265 310 L 270 335 L 225 345 Z' },
  { id: 'NG-KD', name: 'Kaduna', d: 'M 265 290 L 305 280 L 310 310 L 270 320 Z' },
  { id: 'NG-KN', name: 'Kano', d: 'M 305 260 L 345 250 L 350 280 L 310 290 Z' },
  { id: 'NG-JI', name: 'Jigawa', d: 'M 345 250 L 380 245 L 385 270 L 350 280 Z' },
  { id: 'NG-YO', name: 'Yobe', d: 'M 380 245 L 420 240 L 425 265 L 385 270 Z' },
  { id: 'NG-BO', name: 'Borno', d: 'M 420 240 L 470 235 L 475 260 L 425 265 Z' },
  { id: 'NG-AD', name: 'Adamawa', d: 'M 380 270 L 420 265 L 425 295 L 385 300 Z' },
  { id: 'NG-TA', name: 'Taraba', d: 'M 340 295 L 380 290 L 385 320 L 345 325 Z' },
  { id: 'NG-PL', name: 'Plateau', d: 'M 305 310 L 340 305 L 345 325 L 310 330 Z' },
  { id: 'NG-BE', name: 'Benue', d: 'M 310 330 L 345 325 L 350 355 L 315 360 Z' },
  { id: 'NG-ED', name: 'Edo', d: 'M 285 360 L 315 355 L 320 380 L 290 385 Z' },
  { id: 'NG-DE', name: 'Delta', d: 'M 290 385 L 325 380 L 330 405 L 295 410 Z' },
  { id: 'NG-BY', name: 'Bayelsa', d: 'M 295 410 L 320 405 L 325 425 L 300 430 Z' },
  { id: 'NG-RI', name: 'Rivers', d: 'M 325 380 L 355 375 L 360 405 L 330 410 Z' },
  { id: 'NG-AB', name: 'Abia', d: 'M 355 375 L 375 370 L 380 395 L 360 400 Z' },
  { id: 'NG-IM', name: 'Imo', d: 'M 375 370 L 395 365 L 400 390 L 380 395 Z' },
  { id: 'NG-AN', name: 'Anambra', d: 'M 395 365 L 415 360 L 420 385 L 400 390 Z' },
  { id: 'NG-EN', name: 'Enugu', d: 'M 415 360 L 435 355 L 440 380 L 420 385 Z' },
  { id: 'NG-EB', name: 'Ebonyi', d: 'M 435 355 L 455 350 L 460 375 L 440 380 Z' },
  { id: 'NG-CR', name: 'Cross River', d: 'M 455 350 L 480 345 L 485 370 L 460 375 Z' },
  { id: 'NG-AK', name: 'Akwa Ibom', d: 'M 480 345 L 500 340 L 500 365 L 485 370 Z' },
  { id: 'NG-ZA', name: 'Zamfara', d: 'M 220 280 L 265 270 L 270 295 L 225 305 Z' },
  { id: 'NG-SO', name: 'Sokoto', d: 'M 180 270 L 220 260 L 225 285 L 185 295 Z' },
  { id: 'NG-KE', name: 'Kebbi', d: 'M 185 295 L 225 285 L 230 310 L 190 320 Z' },
  { id: 'NG-KT', name: 'Katsina', d: 'M 265 250 L 305 240 L 310 265 L 270 275 Z' },
  { id: 'NG-BA', name: 'Bauchi', d: 'M 310 280 L 345 275 L 350 300 L 315 305 Z' },
  { id: 'NG-GO', name: 'Gombe', d: 'M 345 275 L 375 270 L 380 295 L 350 300 Z' },
];

function normalizeStateName(region: string): string {
  return region.trim().toLowerCase().replace(/\s+/g, ' ');
}

function densityColor(count: number, max: number): string {
  if (max === 0 || count === 0) return 'rgb(148 163 184 / 0.25)';
  const t = count / max;
  if (t >= 0.75) return 'var(--color-brand-600)';
  if (t >= 0.5) return 'var(--color-brand-500)';
  if (t >= 0.25) return 'var(--color-brand-400)';
  return 'var(--color-brand-200)';
}

export interface NigeriaChoroplethProps {
  /** Map of state name → school count in network. */
  schoolsByState: Record<string, number>;
  selectedState?: string | null;
  onStateSelect?: (state: string | null) => void;
  className?: string;
}

export function NigeriaChoropleth({
  schoolsByState,
  selectedState,
  onStateSelect,
  className,
}: NigeriaChoroplethProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const countsByPathId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const state of STATE_PATHS) {
      const key = normalizeStateName(state.name);
      let count = 0;
      for (const [region, n] of Object.entries(schoolsByState)) {
        if (normalizeStateName(region) === key || normalizeStateName(region).includes(key)) {
          count += n;
        }
      }
      map[state.id] = count;
    }
    return map;
  }, [schoolsByState]);

  const maxCount = Math.max(1, ...Object.values(countsByPathId));

  const activeId = hovered
    ? STATE_PATHS.find((s) => s.name === hovered)?.id
    : selectedState
      ? STATE_PATHS.find((s) => normalizeStateName(s.name) === normalizeStateName(selectedState))?.id
      : null;

  const tooltipState = hovered ?? selectedState;

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox="0 0 500 520"
        className="h-auto w-full max-h-[420px]"
        role="img"
        aria-label="Nigeria school density map"
      >
        <rect
          x="0"
          y="0"
          width="500"
          height="520"
          className="fill-neutral-100 dark:fill-forest-900"
          rx="8"
        />
        {STATE_PATHS.map((state) => {
          const count = countsByPathId[state.id] ?? 0;
          const isActive = activeId === state.id;
          return (
            <path
              key={state.id}
              d={state.d}
              fill={densityColor(count, maxCount)}
              stroke={isActive ? 'var(--color-gold-400)' : 'var(--color-neutral-200)'}
              strokeWidth={isActive ? 2 : 0.75}
              className="cursor-pointer transition-all duration-150 hover:opacity-90 dark:stroke-forest-700"
              onMouseEnter={() => setHovered(state.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onStateSelect?.(selectedState === state.name ? null : state.name)}
              aria-label={`${state.name}: ${count} schools`}
            />
          );
        })}
      </svg>

      {tooltipState ? (
        <div className="absolute bottom-3 left-3 rounded-sm border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-forest-700 dark:bg-forest-900/95">
          <p className="font-serif text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {tooltipState}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {countsByPathId[STATE_PATHS.find((s) => s.name === tooltipState)?.id ?? ''] ?? 0}{' '}
            schools in network
          </p>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 text-xs text-neutral-500 dark:text-neutral-400">
          Click a state to filter
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
        <span>Fewer</span>
        <div className="flex h-2 flex-1 max-w-[120px] overflow-hidden rounded-full">
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <div
              key={t}
              className="h-full flex-1"
              style={{ backgroundColor: densityColor(t * maxCount, maxCount) }}
            />
          ))}
        </div>
        <span>More schools</span>
      </div>
    </div>
  );
}

export { STATE_PATHS };
