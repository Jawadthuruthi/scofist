"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";

export default function Providers({ children }) {
  useEffect(() => {
    // Intercept and swallow non-Error unhandled rejections and window error events
    // (e.g. browser Event objects from WebSocket disconnects, HMR or Service Worker in dev)
    const handleUnhandledRejection = (event) => {
      if (
        event &&
        (event.reason instanceof Event ||
          (event.reason && typeof event.reason === "object" && (event.reason.type || event.reason.isTrusted)) ||
          !event.reason)
      ) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      }
    };

    const handleError = (event) => {
      if (
        event &&
        (event instanceof Event ||
          event.error instanceof Event ||
          (event.error && typeof event.error === "object" && (event.error.type || event.error.isTrusted)) ||
          !event.message ||
          event.message === "Script error." ||
          !(event.error instanceof Error))
      ) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        // In development, unregister any active service worker so it doesn't break HMR and WebSocket connections
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      }
    }

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute cache freshness
            refetchOnWindowFocus: false, // Stop refetch avalanches when users switch tabs
            refetchOnReconnect: true, // Automatically re-sync after network reconnection
            retry: 1, // Fail fast on real network errors
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
