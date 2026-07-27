import { Suspense } from "react";
import Footer from "@/components/footer";
import Navbar from "@/components/navigation/navbar";

// app/auth/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`antialiased relative `}>
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="pt-16 flex-grow">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
