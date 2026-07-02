"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { useSessionHydration } from "@/stores/session-store";

/**
 * Rehydrates the Zustand session slice from the persisted sessionStorage
 * snapshot exactly once per page load. Kept as a leaf component so it can
 * run its useEffect after all providers have mounted, without adding a
 * dedicated wrapper.
 */
const SessionHydrator: React.FC = () => {
  useSessionHydration();
  return null;
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ThemeProvider>
    <QueryProvider>
      <SessionHydrator />
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{ duration: 4000 }}
      />
    </QueryProvider>
  </ThemeProvider>
);
