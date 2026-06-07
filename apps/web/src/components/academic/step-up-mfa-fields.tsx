'use client';

import {
  Alert,
  AlertDescription,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@loomis/ui-web';
import type { Control, FieldValues, Path } from 'react-hook-form';

interface StepUpMfaFieldsProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
}

/** Inline authenticator code field for step-up MFA before a financial mutation. */
export function StepUpMfaFields<T extends FieldValues>({ control, name }: StepUpMfaFieldsProps<T>) {
  return (
    <div className="space-y-3">
      <Alert variant="warning">
        <AlertDescription>
          Step-up verification is required. Enter the 6-digit code from your authenticator app.
        </AlertDescription>
      </Alert>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Authenticator code</FormLabel>
            <FormControl>
              <Input
                {...field}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="font-mono tracking-widest"
                onChange={(e) => {
                  field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
