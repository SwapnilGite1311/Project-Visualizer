import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  name: string;
  children: ReactNode;
}
interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.name}]`, error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 12 }}>
        <div style={{ fontWeight: 600 }}>{this.props.name} failed to load.</div>
        <div style={{ color: 'var(--fg-muted)', margin: '4px 0 8px' }}>
          {this.state.error.message}
        </div>
        <button onClick={() => this.setState({ error: null })}>Retry</button>
      </div>
    );
  }
}
