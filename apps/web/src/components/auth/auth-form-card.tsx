import type { ReactNode } from 'react';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@loomis/ui-web';

import { TiltContainer } from '@/components/auth/tilt-container';

interface AuthFormCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthFormCard({ title, subtitle, children, footer }: AuthFormCardProps) {
  return (
    <TiltContainer className="w-full">
      <div className="w-full glass-beveled-3d rounded-lg">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
          {subtitle ? <CardDescription className="text-neutral-400">{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? (
          <CardFooter className="flex-col items-stretch gap-0 border-t border-white/5 pt-0">
            {footer}
          </CardFooter>
        ) : null}
      </div>
    </TiltContainer>
  );
}
