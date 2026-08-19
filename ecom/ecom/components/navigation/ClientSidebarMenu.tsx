"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };
type Brand = { id: string; name: string };

export default function ClientSidebarMenu({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [openSection, setOpenSection] = useState<string | null>("categories");
  const supabase = createClient();

  useEffect(() => {
    const fetchDicts = async () => {
      const [catsRes, subcatsRes, brandsRes] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("subcategories").select("id, name, category_id").order("name"),
        supabase.from("brands").select("id, name").order("name"),
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (subcatsRes.data) setSubcategories(subcatsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
    };
    fetchDicts();
  }, [supabase]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="flex flex-col gap-4 text-sm mt-4">
      <Link href="/products" onClick={onClose} className="font-semibold text-base py-2 hover:text-yellow-600 transition-colors">
        Tous les produits
      </Link>

      <div className="border-t pt-4">
        <button 
          onClick={() => toggleSection("categories")}
          className="flex justify-between items-center w-full font-semibold text-base py-2 hover:text-yellow-600 transition-colors"
        >
          Catégories
          <ChevronDown className={`w-4 h-4 transition-transform ${openSection === "categories" ? "rotate-180" : ""}`} />
        </button>
        {openSection === "categories" && (
          <ul className="pl-4 mt-2 flex flex-col gap-3 max-h-64 overflow-y-auto pr-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link 
                  href={`/products?category=${encodeURIComponent(cat.name)}`} 
                  onClick={onClose}
                  className="block font-medium text-gray-800 hover:text-yellow-600 mb-1"
                >
                  {cat.name}
                </Link>
                {/* Subcategories */}
                <ul className="pl-3 mt-1 flex flex-col gap-1 border-l-2 border-yellow-100 ml-1">
                  {subcategories.filter(s => s.category_id === cat.id).map(sub => (
                    <li key={sub.id}>
                      <Link 
                        href={`/products?subcategory=${encodeURIComponent(sub.name)}`} 
                        onClick={onClose}
                        className="text-gray-500 hover:text-yellow-600 text-xs"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t pt-4">
        <button 
          onClick={() => toggleSection("brands")}
          className="flex justify-between items-center w-full font-semibold text-base py-2 hover:text-yellow-600 transition-colors"
        >
          Marques
          <ChevronDown className={`w-4 h-4 transition-transform ${openSection === "brands" ? "rotate-180" : ""}`} />
        </button>
        {openSection === "brands" && (
          <ul className="pl-4 mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link 
                  href={`/products?brand=${encodeURIComponent(brand.name)}`} 
                  onClick={onClose}
                  className="text-gray-700 hover:text-yellow-600"
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
