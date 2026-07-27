import { Pill } from "lucide-react";
import PageModel from "./components/pageModel";
export default async function Account() {
  return (
    <div className="w-screen h-screen overflow-x-hidden pl-60">
      <section className="w-full h-fit min-h-screen  flex flex-col   xl:px-16 md:px-8 py-16 justify-start  overflow-auto">
        <div className="flex flex-col items-start w-full h-fit gap-8  ">
          <h1 className="text-3xl font-medium text-yellow-800">
            <Pill className="inline  mb-1 mr-2 size-8 " strokeWidth={2.2} />
            Inventory
          </h1>
        </div>
        <PageModel />
      </section>
    </div>
  );
}
