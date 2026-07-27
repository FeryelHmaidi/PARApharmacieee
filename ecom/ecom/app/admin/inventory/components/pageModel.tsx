"use client";
import Table from "./table/table";

const PageModel = () => {
  /*const {
    data: subscriptions,
    isLoading,
    isError,
    error,
  } = useFetchSubscriptions(layoutId || "");
  if (!layoutId) return null;*/

  const totalSales = 4500;
  const currentActiveSubscriptions = 8848;
  const totalRevenue = 800000;
  return (
    <div className="">
      <div className="w-full flex justify-end">
        {/* <OverlayPanel layoutId={layoutId} />*/}
      </div>
      {/*   <div className="w-full h-fit flex gap-2 mt-6">
       <div className="px-6 py-4 flex flex-col gap-4 border flex-1 rounded-md  hover:scale-[1.01] transition">
          <h2 className="text-4xl ">{totalSales}</h2>
          <p className="text-sm text-gray-400">Total Sold Subscriptions</p>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4 border flex-1 rounded-md  hover:scale-[1.01] transition">
          <h2 className="text-4xl ">{currentActiveSubscriptions}</h2>
          <p className="text-sm text-gray-400">Active Subscriptions</p>
        </div>{" "}
        <div className="px-6 py-4 flex flex-col gap-4 border flex-1 rounded-md  hover:scale-[1.01] transition">
          <h2 className="text-4xl ">{totalRevenue} TND</h2>
          <p className="text-sm text-gray-400">Total revenue</p>
        </div>
      </div>*/}
      <Table />
    </div>
  );
};

export default PageModel;
