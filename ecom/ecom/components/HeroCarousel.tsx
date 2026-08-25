"use client";

import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const CustomDot = ({
  onClick,
  active,
  ...rest
}: {
  onClick?: () => void;
  active?: boolean;
  [key: string]: any;
}) => {
  return (
    <motion.button
      className={`mx-1 size-2.5 mb-2 rounded-full ${
        active ? "bg-yellow-600" : "bg-gray-300"
      }`}
      onClick={onClick}
      animate={{
        scale: active ? 1.2 : 1,
        width: active ? 18 : 10,
      }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    />
  );
};

const responsive = {
  desktop: { breakpoint: { max: 3000, min: 1024 }, items: 1 },
  tablet: { breakpoint: { max: 1024, min: 464 }, items: 1 },
  mobile: { breakpoint: { max: 464, min: 0 }, items: 1 },
};

/** A single slide with mouse-tracked parallax depth on the product image */
function HeroSlide({
  slide,
  index,
}: {
  slide: { title: string; description: string; buttonText: string; image: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springX = useSpring(rawX, { stiffness: 200, damping: 28 });
  const springY = useSpring(rawY, { stiffness: 200, damping: 28 });

  // Image layer moves opposite to cursor (parallax depth)
  const imgX = useTransform(springX, [-1, 1], [-18, 18]);
  const imgY = useTransform(springY, [-1, 1], [-10, 10]);
  // Text layer moves slightly with cursor
  const textX = useTransform(springX, [-1, 1], [6, -6]);
  const textY = useTransform(springY, [-1, 1], [4, -4]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawX.set((e.clientX - rect.left - rect.width / 2) / (rect.width / 2));
    rawY.set((e.clientY - rect.top - rect.height / 2) / (rect.height / 2));
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full p-2 sm:p-4 bg-zinc-50"
    >
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-zinc-50 rounded-lg p-4 md:p-6 h-full min-h-[60vh] sm:min-h-[65vh] md:min-h-[70vh] overflow-hidden">
        {/* Text column — moves slightly with mouse */}
        <motion.div
          style={{ x: textX, y: textY }}
          className="flex-1 flex items-center flex-col space-y-3 md:space-y-4 w-full md:w-auto md:min-w-0 md:self-center"
        >
          <div className="flex items-center flex-col space-y-2 md:space-y-4 text-center md:text-left">
            <motion.h2
              key={slide.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold"
            >
              {slide.title}
            </motion.h2>
            <motion.p
              key={slide.description}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-[400px] px-2 md:px-0"
            >
              {slide.description}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/products"
              className="inline-block bg-yellow-600 text-white px-6 py-2 md:px-10 md:py-4 rounded-md hover:bg-yellow-700 transition text-sm md:text-base whitespace-nowrap touch-manipulation shadow-lg shadow-yellow-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              {slide.buttonText}
            </Link>
          </motion.div>
        </motion.div>

        {/* Image column — parallax shifts opposite to cursor */}
        <div className="flex-1 w-full md:w-auto flex items-center justify-center min-h-[250px] sm:min-h-[300px] md:min-h-[350px] md:h-[400px] lg:h-[500px] relative md:self-stretch">
          <motion.div
            style={{ x: imgX, y: imgY }}
            className="relative w-full h-full max-w-full max-h-full min-h-[250px] sm:min-h-[300px] md:min-h-[350px] md:h-full"
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              priority={index === 0}
              draggable={false}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function HeroCarousel() {
  const slides = [
    {
      title: "Collection d'Été",
      description:
        "Découvrez nos derniers styles d'été avec jusqu'à 50% de réduction sur une sélection d'articles.",
      buttonText: "Acheter",
      image: "/cover.svg",
    },
    {
      title: "Nouveautés",
      description:
        "Soyez les premiers à explorer notre nouvelle collection de pièces tendance.",
      buttonText: "Acheter",
      image: "/cover.svg",
    },
    {
      title: "Édition Limitée",
      description:
        "Des pièces exclusives qui définissent le luxe et le style. Disponible pour une durée limitée.",
      buttonText: "Acheter",
      image: "/cover.svg",
    },
    {
      title: "Accessoires",
      description:
        "Complétez votre look avec notre sélection d'accessoires premium.",
      buttonText: "Acheter",
      image: "/cover.svg",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden mt-16 md:mt-0 touch-pan-y">
      <Carousel
        swipeable={true}
        draggable={true}
        responsive={responsive}
        infinite={true}
        autoPlay={true}
        autoPlaySpeed={3000}
        keyBoardControl={true}
        customTransition="transform 300ms ease-in-out"
        transitionDuration={500}
        containerClass="h-full overflow-hidden"
        arrows={false}
        showDots={true}
        customDot={<CustomDot />}
        dotListClass="flex justify-center items-center absolute -bottom-4 left-0 right-0"
        itemClass="carousel-item-padding-40-px min-h-[60vh] sm:min-h-[65vh] md:min-h-[70vh] lg:min-h-[78vh]"
        shouldResetAutoplay={false}
      >
        {slides.map((slide, index) => (
          <HeroSlide key={index} slide={slide} index={index} />
        ))}
      </Carousel>
    </div>
  );
}
