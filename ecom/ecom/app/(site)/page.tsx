import HeroCarousel from "@/components/HeroCarousel";
import HeroCatagoriesList from "@/components/HeroCatagoriesList";
import HeroCollection from "@/components/HeroCollection";
import CallToAction from "@/components/CallToAction";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen mx-auto w-[85%] flex flex-col items-center gap-16 mt-1 ">
      <HeroCarousel />
      <HeroCollection />
      <HeroCatagoriesList />
      <CallToAction />
    </main>
  );
}
