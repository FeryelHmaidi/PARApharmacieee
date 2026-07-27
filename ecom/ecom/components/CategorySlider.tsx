"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategorySliderProps<T extends string = string> {
  categories: T[];
  selectedCategory: T | null;
  setSelectedCategory: (category: T) => void;
}

const CategorySlider = <T extends string = string>({
  categories,
  selectedCategory,
  setSelectedCategory,
}: CategorySliderProps<T>) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  useEffect(() => {
    checkScroll();
  }, [categories.length]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative w-full">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        disabled={!canScrollLeft}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white border rounded-full shadow-md p-2 transition duration-300 hover:bg-gray-100 z-10 ${
          canScrollLeft ? "opacity-100" : "opacity-50 cursor-not-allowed"
        }`}
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        disabled={!canScrollRight}
        className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 bg-white border rounded-full shadow-md p-2 transition duration-300 hover:bg-gray-100 z-10 ${
          canScrollRight ? "opacity-100" : "opacity-50 cursor-not-allowed"
        }`}
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* Scrollable categories */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar whitespace-nowrap px-10 py-2 scroll-smooth"
      >
        {categories.map((category, index) => (
          <button
            key={index}
            className={`px-4 py-2 rounded-full border flex-shrink-0 transition duration-200
              ${
                selectedCategory === category
                  ? "bg-yellow-600 text-white border-yellow-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-yellow-600 hover:text-white"
              }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Hide scrollbar */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default CategorySlider;
