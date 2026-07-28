import { Pill } from "lucide-react";
import PageModel from "./components/pageModel";
export default async function Account() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Pill className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Inventory
          </h1>
        </div>
        <PageModel />
      </section>
    </div>
  );
}
