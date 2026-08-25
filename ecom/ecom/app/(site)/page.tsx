"use client";

import HeroCarousel from "@/components/HeroCarousel";
import HeroCatagoriesList from "@/components/HeroCatagoriesList";
import HeroCollection from "@/components/HeroCollection";
import CallToAction from "@/components/CallToAction";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="min-h-screen mx-auto w-[95%] sm:w-[90%] md:w-[85%] flex flex-col items-center gap-8 sm:gap-12 md:gap-16 mt-1">
      {/* 1. Hero Carousel with subtle fade-in & scale */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <HeroCarousel />
      </motion.div>

      {/* 2. Featured Collection with viewport reveal */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <HeroCollection />
      </motion.div>

      {/* 3. Categories & Catalog with smooth slide-up */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      >
        <HeroCatagoriesList />
      </motion.div>

      {/* 4. Call To Action with soft bounce-in */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <CallToAction />
      </motion.div>
    </main>
  );
}

