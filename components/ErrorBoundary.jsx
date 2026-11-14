"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback({ error: this.state.error, resetError: this.resetError })
          : this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center p-6 bg-destructive/5 border border-destructive/20 rounded-lg text-center"
          role="alert"
        >
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <h3 className="font-semibold text-sm text-foreground mb-1">
            {this.props.title || "Failed to load content"}
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm">
            {this.state.error?.message || "An unexpected error occurred while rendering this section."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.resetError}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
