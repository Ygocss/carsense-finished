import React from "react";

type Props = { name?: string; children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error(`[ErrorBoundary] ${this.props.name ?? ""}`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, border: "1px solid #f55", borderRadius: 8, background: "#2a0000", color: "#fff" }}>
          <strong>⚠️ Error en {this.props.name ?? "Componente"}:</strong>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
