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

  const toggleCategory = (catId: string) => {
    setOpenSection(openSection === `cat-${catId}` ? "categories" : `cat-${catId}`);
  };

  return (
    <div className="flex flex-col gap-4 text-sm mt-4 pb-20">
      <Link href="/products" onClick={onClose} className="font-semibold text-base py-2 hover:text-yellow-600 transition-colors uppercase">
        Tous les produits
      </Link>

      <div className="border-t pt-4">
        <button 
          onClick={() => toggleSection("categories")}
          className="flex justify-between items-center w-full font-bold text-base py-2 hover:text-yellow-600 transition-colors uppercase tracking-wide"
        >
          Catégories
          <ChevronDown className={`w-4 h-4 transition-transform ${openSection === "categories" || openSection?.startsWith("cat-") ? "rotate-180" : ""}`} />
        </button>
        
        {(openSection === "categories" || openSection?.startsWith("cat-")) && (
          <ul className="pl-4 mt-2 flex flex-col gap-4 max-h-96 overflow-y-auto pr-2">
            {categories.map((cat) => {
              const catSubcats = subcategories.filter(s => s.category_id === cat.id);
              const isCatOpen = openSection === `cat-${cat.id}`;
              
              return (
                <li key={cat.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <Link 
                      href={`/products?category=${encodeURIComponent(cat.name)}`} 
                      onClick={onClose}
                      className="block font-semibold text-gray-800 hover:text-yellow-600"
                    >
                      {cat.name}
                    </Link>
                    {catSubcats.length > 0 && (
                      <button onClick={() => toggleCategory(cat.id)} className="p-1">
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isCatOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  
                  {/* Sous-catégories explicitement affichées */}
                  {catSubcats.length > 0 && isCatOpen && (
                    <div className="mt-2 pl-3 border-l-2 border-yellow-200 ml-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Sous-catégories
                      </span>
                      <ul className="flex flex-col gap-2">
                        {catSubcats.map(sub => (
                          <li key={sub.id}>
                            <Link 
                              href={`/products?subcategory=${encodeURIComponent(sub.name)}`} 
                              onClick={onClose}
                              className="text-gray-500 hover:text-yellow-600 transition-colors text-sm"
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t pt-4">
        <button 
          onClick={() => toggleSection("brands")}
          className="flex justify-between items-center w-full font-bold text-base py-2 hover:text-yellow-600 transition-colors uppercase tracking-wide"
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
                  className="text-gray-600 hover:text-yellow-600 font-medium text-sm"
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
