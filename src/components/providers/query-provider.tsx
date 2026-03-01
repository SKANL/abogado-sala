"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh for 5 minutes — avoids refetching on every component mount.
            // Realtime subscriptions handle live updates, so staleness matters less here.
            staleTime: 5 * 60 * 1000,
            // Keep unused cache for 10 minutes before garbage collecting.
            gcTime: 10 * 60 * 1000,
            // Switching browser tabs should NOT trigger refetches in a law-firm app
            // where tabs are often kept open for hours. Realtime covers live updates.
            refetchOnWindowFocus: false,
            // Only retry once — faster failure feedback, fewer wasted requests.
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
