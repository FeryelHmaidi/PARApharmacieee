"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const CallToAction = () => {
  return (
    <div className="w-full relative min-h-[500px]  rounded-2xl overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center "
        style={{
          backgroundImage: 'url("/pharma-bg.jpg")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full w-full p-12 flex flex-col justify-center  items-right">
        <div className="max-w-[600px] space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold  text-white leading-tight">
            Votre santé mérite
            <span className="text-yellow-400"> le meilleur service</span>
          </h2>

          <p className="text-gray-700 text-lg md:text-xl max-w-[500px]">
            Découvrez notre large gamme de produits pharmaceutiques et de soins,
            livrés directement chez vous avec un service professionnel.
          </p>

          <div className="flex gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 h-12 text-lg"
            >
              <Link href="/products">
                Commencer vos achats
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallToAction;
