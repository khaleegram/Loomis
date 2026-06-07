import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, ...props },
  ref,
) {
  const fieldId = id ?? props.name;
  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={fieldId}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        {...props}
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}
