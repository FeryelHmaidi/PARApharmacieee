import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/products", label: "Produits" },
  { href: "/cart", label: "Panier" },
  { href: "/orders", label: "Commandes" },
  { href: "/profile", label: "Profil" },
];

interface AccountPageHeaderProps {
  title: string;
  subtitle: string;
  activePath?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export const AccountPageHeader = ({
  title,
  subtitle,
  activePath,
  eyebrow = "Espace client",
  actions,
}: AccountPageHeaderProps) => {
  return (
    <header className="bg-gradient-to-r from-yellow-600 via-yellow-600 to-yellow-700 text-white shadow-lg">
      <div className="mx-auto w-[90%] max-w-6xl py-8 md:py-12 flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              {title}
            </h1>
            <p className="text-base text-white/90 md:max-w-2xl">{subtitle}</p>
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>

        <nav className="flex flex-wrap gap-2 text-sm">
          {navLinks.map((link) => {
            const isActive = activePath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 transition backdrop-blur border border-white/20",
                  isActive
                    ? "bg-white text-yellow-700 shadow-lg"
                    : "text-white/85 hover:bg-white/15"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
