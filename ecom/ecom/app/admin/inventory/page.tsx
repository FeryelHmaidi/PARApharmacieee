import { Pill } from "lucide-react";
import PageModel from "./components/pageModel";
export default async function Account() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
      <section className="w-full flex flex-col gap-5 justify-start">
        <div className="flex flex-col items-start w-full gap-2">
          <h1 className="text-xl md:text-2xl font-medium text-yellow-800">
            <Pill className="inline mb-1 mr-2 size-6 md:size-7" strokeWidth={2.2} />
            Inventory
          </h1>
        </div>
        <PageModel />
      </section>
    </div>
  );
}
