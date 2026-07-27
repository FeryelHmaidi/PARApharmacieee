// components/Providers.tsx  (Client Component)
"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { CartOwnerSync } from "./CartOwnerSync";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={true} // match your previous behaviour if you like
        disableTransitionOnChange
      >
        <SidebarProvider>
          <CartOwnerSync />
          {children}
          <Toaster richColors />
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
