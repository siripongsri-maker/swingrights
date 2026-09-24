import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode }
interface State { hasError: boolean }

function ErrorFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center bg-card border border-border rounded-2xl p-6 shadow-elegant">
        <h1 className="text-base font-medium mb-1.5">{t('guard.errorTitle')}</h1>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {t('guard.errorBody')}
        </p>
        <Button
          variant="action"
          onClick={() => window.location.reload()}
          className="w-full text-sm"
        >
          {t('guard.reload')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Phase 0.13 — app-level error boundary.
 * Deliberately reports NO case content: only the error name/message is kept locally,
 * never the component tree data, form values, or network payloads.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    // PII-safe reporting hook: forward only the error type, never the payload.
    console.error('[ui-error]', error.name, error.message);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback />;
  }
}
