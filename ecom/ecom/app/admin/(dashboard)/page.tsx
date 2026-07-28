import { LayoutDashboard } from "lucide-react";
import PageModel from "./components/PageModel";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="flex w-full flex-col gap-6 md:gap-8">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">
            <LayoutDashboard className="mr-2 inline h-7 w-7 md:h-8 md:w-8 text-yellow-600" />{" "}
            Dashboard
          </h1>
        </header>

        <PageModel />
      </section>
    </div>
  );
}
