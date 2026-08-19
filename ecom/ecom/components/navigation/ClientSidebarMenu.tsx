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
    <div className="flex flex-col gap-6 text-sm mt-6 pb-20">
      <Link href="/products" onClick={onClose} className="font-bold text-base hover:text-yellow-600 transition-colors uppercase tracking-wide">
        Tous les produits
      </Link>

      <div className="flex flex-col gap-6">
        {categories.map((cat) => {
          const catSubcats = subcategories.filter(s => s.category_id === cat.id);
          return (
            <div key={cat.id} className="border-b pb-4 last:border-b-0">
              <Link 
                href={`/products?category=${encodeURIComponent(cat.name)}`} 
                onClick={onClose}
                className="block font-bold text-gray-800 uppercase tracking-widest text-xs mb-3 hover:text-yellow-600"
              >
                {cat.name}
              </Link>
              {catSubcats.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {catSubcats.map(sub => (
                    <li key={sub.id}>
                      <Link 
                        href={`/products?subcategory=${encodeURIComponent(sub.name)}`} 
                        onClick={onClose}
                        className="text-gray-500 hover:text-yellow-600 transition-colors font-medium text-sm"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t pt-6">
        <h3 className="font-bold text-gray-800 uppercase tracking-widest text-xs mb-3">
          MARQUES
        </h3>
        <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link 
                href={`/products?brand=${encodeURIComponent(brand.name)}`} 
                onClick={onClose}
                className="text-gray-500 hover:text-yellow-600 font-medium text-sm"
              >
                {brand.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
