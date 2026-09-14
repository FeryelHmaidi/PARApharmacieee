import HeroCarousel from "@/components/HeroCarousel";
import HeroCatagoriesList from "@/components/HeroCatagoriesList";
import HeroCollection from "@/components/HeroCollection";
import CallToAction from "@/components/CallToAction";
import TrustBar from "@/components/TrustBar";
import QuickCategories from "@/components/QuickCategories";

export default function Home() {
  return (
    <main className="min-h-screen mx-auto w-[95%] sm:w-[90%] md:w-[85%] flex flex-col items-center gap-6 sm:gap-8 md:gap-12 mt-1 pb-12">
      <HeroCarousel />
      <TrustBar />
      <QuickCategories />
      <HeroCollection />
      <HeroCatagoriesList />
      <CallToAction />
    </main>
  );
}
