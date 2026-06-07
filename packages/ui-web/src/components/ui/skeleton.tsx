'use client';

import { cn } from '../../lib/utils.js';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-0 after:-translate-x-full',
        'after:animate-[shimmer_1.8s_ease-in-out_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent',
        'dark:after:via-white/5',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
