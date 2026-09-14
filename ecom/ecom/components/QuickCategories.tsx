"use client";

import Link from "next/link";
import { Sparkles, Sun, Heart, Flame, Shield, Baby, Smile, Pill } from "lucide-react";

const CATEGORIES = [
  { name: "Soin Visage", query: "visage", icon: Sparkles, color: "from-pink-500/10 to-rose-500/20 text-rose-700 border-rose-200" },
  { name: "Solaire", query: "solaire", icon: Sun, color: "from-amber-500/10 to-yellow-500/20 text-amber-800 border-amber-200" },
  { name: "Cheveux", query: "cheveux", icon: Heart, color: "from-purple-500/10 to-indigo-500/20 text-purple-700 border-purple-200" },
  { name: "Corps & Bain", query: "corps", icon: Shield, color: "from-blue-500/10 to-cyan-500/20 text-blue-700 border-blue-200" },
  { name: "Bébé & Maman", query: "bebe", icon: Baby, color: "from-teal-500/10 to-emerald-500/20 text-teal-700 border-teal-200" },
  { name: "Hygiène & Soins", query: "hygiene", icon: Smile, color: "from-sky-500/10 to-blue-500/20 text-sky-700 border-sky-200" },
  { name: "Compléments", query: "complement", icon: Pill, color: "from-emerald-500/10 to-green-500/20 text-emerald-800 border-emerald-200" },
  { name: "Promotions", query: "promo", icon: Flame, color: "from-red-500/15 to-orange-500/25 text-red-700 border-red-300 font-bold" },
];

export default function QuickCategories() {
  return (
    <section className="w-full my-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>Univers & Catégories</span>
        </h2>
        <Link
          href="/products"
          className="text-xs font-semibold text-yellow-700 hover:text-yellow-800 transition"
        >
          Tout voir →
        </Link>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.name}
              href={`/products?q=${encodeURIComponent(cat.query)}`}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border bg-gradient-to-br shadow-2xs hover:shadow-xs transition duration-200 whitespace-nowrap shrink-0 ${cat.color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
