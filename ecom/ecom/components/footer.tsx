"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="mt-24 border-t bg-yellow-50/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-yellow-600">
              À propos de nous
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Votre pharmacie en ligne de confiance. Produits triés, conseils
              clairs et équipe attentive pour votre bien-être quotidien.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <a
                href="#"
                className="text-gray-500 transition hover:text-yellow-600"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="text-gray-500 transition hover:text-yellow-600"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="text-gray-500 transition hover:text-yellow-600"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-yellow-600">
              Liens rapides
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  className="transition hover:text-yellow-600"
                  href="/products"
                >
                  Nos produits
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-yellow-600"
                  href="/categories"
                >
                  Catégories
                </Link>
              </li>
              <li>
                <Link
                  className="transition hover:text-yellow-600"
                  href="/promotions"
                >
                  Promotions
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-yellow-600" href="/blog">
                  Blog santé
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-yellow-600">Contact</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Phone size={18} className="text-yellow-600" />
                <span>+216 123 456 789</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} className="text-yellow-600" />
                <span>contact@pharmastore.tn</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={18} className="mt-1 text-yellow-600" />
                <span>
                  123 Rue de la Santé,
                  <br />
                  Tunis 1000, Tunisie
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Map Section */}
        <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                Nous trouver
              </p>
              <h4 className="mt-2 text-2xl font-semibold text-yellow-700">
                Pharmacie partenaire · Tunis, Tunisie
              </h4>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
                Prenez rendez-vous ou passez directement à notre point conseil.
                Nous préparons votre commande en amont pour limiter votre temps
                d&apos;attente.
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-yellow-100">
            <iframe
              title="Localisation Tunis"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3218.0560473850487!2d10.179678777485364!3d36.806494272180824!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1302c4306b400a4f%3A0x90c2f651ef6ed9a!2sAvenue%20Habib%20Bourguiba%2C%20Tunis%2C%20Tunisia!5e0!3m2!1sen!2stn!4v1733500000000!5m2!1sen!2stn"
              className="h-[200px] sm:h-[260px] md:h-[320px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-yellow-100 pt-6">
          <div className="flex flex-col items-center gap-4 text-sm text-gray-600 md:flex-row md:justify-between">
            <p>© 2025 PharmaStore. Tous droits réservés.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/terms" className="transition hover:text-yellow-600">
                Conditions d&apos;utilisation
              </Link>
              <Link href="/privacy" className="transition hover:text-yellow-600">
                Politique de confidentialité
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
