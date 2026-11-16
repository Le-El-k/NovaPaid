"use client";

import { ThemeProvider } from "@/app/lib/theme";
import { CurrencyProvider } from "@/app/lib/currency";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </ThemeProvider>
  );
}
