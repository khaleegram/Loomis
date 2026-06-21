/** First token before parens — seed names like "Chidi Okonkwo (JSS3 B parent)". */
export function greetingFirstName(displayName?: string | null): string | undefined {
  if (!displayName?.trim()) return undefined;
  const base = displayName.split('(')[0]?.trim() ?? displayName.trim();
  return base.split(/\s+/)[0];
}

export function timeGreeting(date = new Date()): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function greetingLine(displayName?: string | null): string {
  const first = greetingFirstName(displayName);
  return first ? `${timeGreeting()}, ${first}` : timeGreeting();
}
