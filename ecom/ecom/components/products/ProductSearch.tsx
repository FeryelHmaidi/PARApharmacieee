import React from "react";

interface ProductSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  resultsCount: number;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  search,
  onSearchChange,
  resultsCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between mb-6">
      <div className="flex-1">
        <label className="sr-only" htmlFor="site-search">
          Rechercher
        </label>
        <div className="relative">
          <input
            id="site-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par nom ou description..."
            className="w-full rounded-lg border px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-200"
          />
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-800"
          >
            Effacer
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          Résultats:{" "}
          <span className="font-semibold text-gray-800">{resultsCount}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductSearch;
