"use client";

import React from "react";

interface ProductFiltersProps {
  minPrice: number;
  maxPrice: number;
  minAvailable: number;
  maxAvailable: number;
  onlyInStock: boolean;
  bestSellerOnly: boolean;
  availableSizes: string[];
  selectedSizes: string[];
  availableTags: string[];
  selectedTags: string[];
  availableCats: string[];
  selectedCats: string[];
  availableSubcats: string[];
  selectedSubcats: string[];
  availableBrands: string[];
  selectedBrands: string[];
  onMinPriceChange: (price: number) => void;
  onMaxPriceChange: (price: number) => void;
  onToggleInStock: (value: boolean) => void;
  onToggleBestSeller: (value: boolean) => void;
  onToggleSize: (size: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleCat: (cat: string) => void;
  onToggleSubcat: (subcat: string) => void;
  onToggleBrand: (brand: string) => void;
  onClearAllFilters: () => void;
  formatPrice: (n: number) => string;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  minPrice,
  maxPrice,
  minAvailable,
  maxAvailable,
  onlyInStock,
  bestSellerOnly,
  availableSizes,
  selectedSizes,
  availableTags,
  selectedTags,
  availableCats,
  selectedCats,
  availableSubcats,
  selectedSubcats,
  availableBrands,
  selectedBrands,
  onMinPriceChange,
  onMaxPriceChange,
  onToggleInStock,
  onToggleBestSeller,
  onToggleSize,
  onToggleTag,
  onToggleCat,
  onToggleSubcat,
  onToggleBrand,
  onClearAllFilters,
  formatPrice,
}) => {
  return (
    <aside className="w-full lg:w-80 shrink-0">
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Filtres</h3>

        {/* Price filter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Prix</span>
            <span className="text-sm font-semibold">
              {formatPrice(minPrice)} — {formatPrice(maxPrice)}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => onMinPriceChange(Number(e.target.value))}
              className="w-1/2 rounded-md border px-2 py-1"
            />
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
              className="w-1/2 rounded-md border px-2 py-1"
            />
          </div>

          <input
            type="range"
            min={Math.floor(minAvailable)}
            max={Math.ceil(maxAvailable)}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            className="w-full mt-3"
          />
        </div>

        {/* Availability filter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Disponibilité</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => onToggleInStock(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span>En stock uniquement</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bestSellerOnly}
                onChange={(e) => onToggleBestSeller(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span>Best sellers</span>
            </label>
          </div>
        </div>

        {availableSizes.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tailles</span>
              <span className="text-xs text-gray-500">
                {selectedSizes.length > 0
                  ? `${selectedSizes.length} sélectionnée(s)`
                  : "Toutes"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <button
                    type="button"
                    key={size}
                    onClick={() => onToggleSize(size)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      checked
                        ? "bg-yellow-600 text-white border-yellow-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tags</span>
              <span className="text-xs text-gray-500">
                {selectedTags.length > 0
                  ? `${selectedTags.length} sélectionné(s)`
                  : "Tous"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const checked = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      checked
                        ? "bg-yellow-600 text-white border-yellow-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableCats.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Catégories</span>
              <span className="text-xs text-gray-500">
                {selectedCats.length > 0
                  ? `${selectedCats.length} sélectionné(s)`
                  : "Toutes"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCats.map((cat) => {
                const checked = selectedCats.includes(cat);
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => onToggleCat(cat)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      checked
                        ? "bg-yellow-600 text-white border-yellow-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableSubcats.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Sous-catégories</span>
              <span className="text-xs text-gray-500">
                {selectedSubcats.length > 0
                  ? `${selectedSubcats.length} sélectionné(s)`
                  : "Toutes"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSubcats.map((subcat) => {
                const checked = selectedSubcats.includes(subcat);
                return (
                  <button
                    type="button"
                    key={subcat}
                    onClick={() => onToggleSubcat(subcat)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      checked
                        ? "bg-yellow-600 text-white border-yellow-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
                    }`}
                  >
                    {subcat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableBrands.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Marques</span>
              <span className="text-xs text-gray-500">
                {selectedBrands.length > 0
                  ? `${selectedBrands.length} sélectionné(s)`
                  : "Toutes"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableBrands.map((brand) => {
                const checked = selectedBrands.includes(brand);
                return (
                  <button
                    type="button"
                    key={brand}
                    onClick={() => onToggleBrand(brand)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      checked
                        ? "bg-yellow-600 text-white border-yellow-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
                    }`}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear all */}
        <div className="mt-3">
          <button
            onClick={onClearAllFilters}
            className="w-full px-4 py-2 rounded-lg bg-white border hover:bg-yellow-50 transition-colors duration-300 text-sm"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* small hint */}
      <div className="mt-3 text-xs text-gray-500">
        Astuce: cliquez sur une catégorie en haut pour filtrer rapidement.
      </div>
    </aside>
  );
};

export default ProductFilters;
