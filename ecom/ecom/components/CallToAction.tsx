"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const CallToAction = () => {
  return (
    <div className="w-full relative min-h-[300px] sm:min-h-[400px] md:min-h-[480px] rounded-3xl overflow-hidden shadow-2xl">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
        style={{
          backgroundImage: 'url("/pharma-bg.jpg")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full w-full p-6 sm:p-10 md:p-14 flex flex-col justify-center items-start">
        <motion.div 
          className="max-w-[620px] space-y-6"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            Parapharmacie 100% Certifiée & Rapide
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
            Votre santé mérite
            <span className="text-yellow-400"> le meilleur service</span>
          </h2>

          <p className="text-slate-200 text-sm sm:text-base md:text-lg max-w-[520px] leading-relaxed">
            Découvrez notre large sélection de soins dermo-cosmétiques, compléments et produits de santé, livrés directement chez vous en toute sécurité.
          </p>

          <div className="flex gap-4 pt-2">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                asChild
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-6 h-12 text-sm sm:text-base rounded-xl shadow-lg shadow-yellow-500/25 transition-all"
              >
                <Link href="/products">
                  Commencer vos achats
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CallToAction;
