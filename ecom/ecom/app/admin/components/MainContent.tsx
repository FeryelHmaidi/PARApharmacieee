"use client";

import { useSidebar } from "@/components/ui/sidebar";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { state, setOpen, isMobile } = useSidebar();

  return (
    <main 
      className="flex-1 w-full min-w-0 bg-white text-slate-900"
      onClick={() => {
        if (!isMobile && state === "expanded") {
          setOpen(false);
        }
      }}
    >
      {children}
    </main>
  );
}

