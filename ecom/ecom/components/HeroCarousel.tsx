"use client";

import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Sun, HeartPulse, Flame, ArrowRight, Phone, ShieldCheck } from "lucide-react";

const CustomDot = ({
  onClick,
  active,
}: {
  onClick?: () => void;
  active?: boolean;
  [key: string]: any;
}) => {
  return (
    <motion.button
      className={`mx-1.5 h-2.5 rounded-full transition-all duration-300 ${
        active
          ? "w-8 bg-yellow-600 shadow-sm shadow-yellow-600/50"
          : "w-2.5 bg-slate-300 hover:bg-slate-400"
      }`}
      onClick={onClick}
      aria-label="Changer de diapositive"
      whileTap={{ scale: 0.9 }}
    />
  );
};

const responsive = {
  desktop: {
    breakpoint: { max: 3000, min: 1024 },
    items: 1,
  },
  tablet: {
    breakpoint: { max: 1024, min: 464 },
    items: 1,
  },
  mobile: {
    breakpoint: { max: 464, min: 0 },
    items: 1,
  },
};

const SLIDES = [
  {
    badge: "Parapharmacie & Santé Naturelle",
    badgeIcon: HeartPulse,
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    title: "Chaque jour un geste pour votre santé",
    highlight: "pour votre santé",
    description:
      "Parce que vous méritez le meilleur. Découvrez notre sélection exclusive de soins dermo-cosmétiques certifiés et produits de bien-être.",
    buttonText: "Explorer nos produits",
    buttonHref: "/products",
    secondaryButtonText: "Promotions 🔥",
    secondaryButtonHref: "/products?discount=true",
    phone: "48 006 623 • Sfax, Tunisie",
    image: "/cover.svg",
  },
  {
    badge: "Haute Protection Solaire",
    badgeIcon: Sun,
    badgeColor: "bg-amber-50 text-amber-900 border-amber-200",
    title: "Protection Solaire & Hydratation",
    highlight: "Hydratation",
    description:
      "Préservez le capital jeunesse de votre peau avec les meilleurs écrans solaires minéraux et soins protecteurs des laboratoires agréés.",
    buttonText: "Voir les Solaires",
    buttonHref: "/products?q=solaire",
    phone: "48 006 623 • Sfax, Tunisie",
    image: "/heroslide.png",
  },
  {
    badge: "Soins Capillaires & Anti-Chute",
    badgeIcon: Sparkles,
    badgeColor: "bg-purple-50 text-purple-900 border-purple-200",
    title: "Force & Vitalité pour vos Cheveux",
    highlight: "vos Cheveux",
    description:
      "Des formules expertes, lotions fortifiantes et shampooings traitants pour redonner éclat, force et densité à votre chevelure.",
    buttonText: "Découvrir la Gamme",
    buttonHref: "/products?q=cheveux",
    phone: "48 006 623 • Sfax, Tunisie",
    image: "/heroslide2.png",
  },
  {
    badge: "Offres Spéciales du Moment",
    badgeIcon: Flame,
    badgeColor: "bg-rose-50 text-rose-900 border-rose-200",
    title: "Packs & Bonnes Affaires Santé",
    highlight: "Bonnes Affaires",
    description:
      "Profitez de remises exceptionnelles et de packs avantageux sur une large sélection de marques dermo-cosmétiques indispensables.",
    buttonText: "Profiter des Réductions",
    buttonHref: "/products",
    phone: "48 006 623 • Sfax, Tunisie",
    image: "/cover.svg",
  },
];

export default function HeroCarousel() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl touch-pan-y shadow-xs border border-slate-100/80 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30">
      <Carousel
        swipeable={true}
        draggable={true}
        responsive={responsive}
        infinite={true}
        autoPlay={true}
        autoPlaySpeed={5000}
        keyBoardControl={true}
        customTransition="transform 500ms ease-in-out"
        transitionDuration={500}
        containerClass="h-full overflow-hidden"
        arrows={false}
        showDots={true}
        customDot={<CustomDot />}
        dotListClass="flex justify-center items-center absolute bottom-4 left-0 right-0 z-10"
        itemClass="min-h-[460px] sm:min-h-[500px] md:min-h-[520px] lg:min-h-[540px]"
        shouldResetAutoplay={false}
      >
        {SLIDES.map((slide, index) => {
          const BadgeIcon = slide.badgeIcon;
          return (
            <div key={index} className="w-full h-full p-4 sm:p-6 md:p-10 flex items-center">
              <div className="w-full flex flex-col-reverse md:flex-row items-center justify-between gap-6 md:gap-10">
                {/* Left Text Block */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-4 max-w-xl">
                  {/* Badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${slide.badgeColor}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{slide.badge}</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                    {slide.title}
                  </h1>

                  {/* Subtitle */}
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-[480px]">
                    {slide.description}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    <Link
                      href={slide.buttonHref}
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white px-6 py-3 md:px-8 md:py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{slide.buttonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {slide.secondaryButtonText && (
                      <Link
                        href={slide.secondaryButtonHref || "/products"}
                        className="inline-flex items-center justify-center gap-1.5 bg-white/90 hover:bg-white text-slate-800 border border-slate-200/80 px-5 py-3 md:px-6 md:py-3.5 rounded-xl font-semibold text-sm sm:text-base shadow-2xs hover:shadow-xs transition duration-200 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {slide.secondaryButtonText}
                      </Link>
                    )}
                  </div>

                  {/* Trust Pill / Location & Phone */}
                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-yellow-600" />
                      {slide.phone}
                    </span>
                    <span className="hidden sm:inline text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      100% Produits Authentiques
                    </span>
                  </div>
                </div>

                {/* Right Image Block */}
                <div className="flex-1 w-full max-w-[480px] md:max-w-[540px] flex items-center justify-center">
                  <div className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] drop-shadow-md rounded-2xl overflow-hidden">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 45vw"
                      priority={index === 0}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Carousel>
    </div>
  );
}
