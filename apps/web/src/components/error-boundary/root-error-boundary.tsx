'use client';

import { Component, type ReactNode } from 'react';

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root error boundary — catastrophic render failures (Frontend Architecture §11.2).
 */
export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Structured logging wired in a later pass; avoid PII in client logs.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Something went wrong</h1>
          <p className="max-w-md text-neutral-500">
            An unexpected error occurred. Refresh the page or return to the dashboard.
          </p>
          <button
            type="button"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
