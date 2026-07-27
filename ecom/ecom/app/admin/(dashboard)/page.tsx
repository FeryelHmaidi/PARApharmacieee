import { LayoutDashboard } from "lucide-react";
import PageModel from "./components/PageModel";

export default function AdminDashboardPage() {
  return (
    <div className="h-screen w-screen overflow-x-hidden pl-60">
      <section className="flex min-h-screen w-full flex-col gap-10 overflow-auto px-6 py-16 md:px-12 xl:px-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            <LayoutDashboard className="mr-2 inline h-8 w-8 text-yellow-600" />{" "}
            Dashboard
          </h1>
        </header>

        <PageModel />
      </section>
    </div>
  );
}
