import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getActiveSponsors } from '@/services/sponsors';
import type { Sponsor } from '@/types';

// ─── Category card data ────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: 'Individuals',
    description: 'Children waiting on their own for a family to call home.',
    href: '/gallery?category=individuals',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: 'Siblings',
    description: 'Brother and sister groups who need to stay together.',
    href: '/gallery?category=siblings',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="3.5" />
        <circle cx="16" cy="8" r="3.5" />
        <path d="M1 20c0-3.5 3-6 7-6" />
        <path d="M23 20c0-3.5-3-6-7-6" />
        <path d="M8 14c1.2-.4 2.5-.6 4-.6s2.8.2 4 .6" />
        <path d="M8 14c0 0 0 6 4 6s4-6 4-6" />
      </svg>
    ),
  },
  {
    label: 'Boys',
    description: 'Young men with big personalities and even bigger dreams.',
    href: '/gallery?category=boys',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        <path d="M17 3l4 0 0 4" />
        <path d="M21 3l-5 5" />
      </svg>
    ),
  },
  {
    label: 'Girls',
    description: 'Young women ready to bring joy, creativity, and love to a home.',
    href: '/gallery?category=girls',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        <line x1="12" y1="21" x2="12" y2="17" />
        <line x1="10" y1="19" x2="14" y2="19" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    getActiveSponsors().then(setSponsors).catch((e: unknown) => {
      console.error('[LandingPage] Failed to load sponsors:', e);
    });
  }, []);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#faf9f7]">

      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-lg tracking-tight drop-shadow">
          Spencer's Home
        </span>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Staff sign in
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {/*
        Drop your hero image at public/hero.jpg.
        Use a photo where a child is sharp in the foreground and family figures
        are visible but softened in the background — the CSS blur handles the rest.
      */}
      <section ref={heroRef} className="relative z-10 h-[460px] overflow-hidden">
        {/* Blurred background layer */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero.png')",
            filter: 'blur(14px)',
            transform: 'scale(1.12)',
          }}
        />
        {/* Warm dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-amber-950/60" />

        {/* Content */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6"
        >
          {/* Foreground portrait — same image, sharp, framed */}
          <div className="mb-7 relative">
            <div className="w-80 h-[12.5rem] rounded-2xl overflow-hidden border-4 border-white/70 shadow-2xl mx-auto">
              <img
                src="/hero.png"
                alt="A child waiting for a forever family"
                className="w-full h-full object-cover object-right"
              />
            </div>
            {/* Warm glow ring */}
            <div className="absolute inset-0 rounded-2xl ring-4 ring-amber-400/30 pointer-events-none" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-2xl drop-shadow-lg">
            Every Child Deserves a Forever Family
          </h1>
          <div className="relative z-30 mt-6">
            <Link
              to="/gallery"
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg transition-colors text-base"
            >
              Meet Our Kids
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Category cards ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 mt-8 relative z-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={cat.href}
              className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-lg hover:shadow-xl border border-gray-200 transition-all hover:-translate-y-1 group"
            >
              <div className="text-amber-500 mb-3 group-hover:scale-110 transition-transform">
                {cat.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-2xl mb-1">{cat.label}</h3>
              <p className="text-xs text-gray-500 leading-snug">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="flex flex-col sm:flex-row gap-12 items-start">
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
              Our Story
            </p>
            <h2 className="text-3xl font-bold text-gray-900 leading-snug mb-5">
              Built on one belief: no child should wait in silence.
            </h2>
            <div className="space-y-4 text-gray-600 text-[15px] leading-relaxed">
              <p>
                Thousands of children are legally free to be adopted — and completely invisible.
                Buried in outdated systems. Represented by a photo that's three years old, if
                they're represented at all.
              </p>
              <p>
                Spencer's Home exists to change that.
              </p>
              <p>
                We give waiting children something the system never has — a real presence. Families
                hear a child's laugh, learn what they dream about, and begin to picture them at the
                dinner table. Because the right family is always out there. They just don't know the
                child exists yet.
              </p>
              <p>
                This platform is named for Spencer — a child who lived in our home, and who reminded
                us that every kid deserves to be found.
              </p>
            </div>
          </div>

          <div className="sm:w-56 flex-shrink-0 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-md">
              <p className="text-3xl font-bold text-amber-600">70,000+</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                Children currently waiting for a forever family in the U.S.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-md">
              <p className="text-3xl font-bold text-amber-600">3 years</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                The average time a child spends waiting for a home
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-md">
              <p className="text-3xl font-bold text-amber-600">1 mission</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">
                To ensure every child is seen, known, and loved
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sponsors ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-3xl font-semibold text-gray-400 uppercase tracking-widest mb-8">
            Our Partners &amp; Sponsors
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 items-center justify-items-center">
            {sponsors.length > 0
              ? sponsors.map((sponsor) => {
                  const logo = (
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className="max-h-32 max-w-[280px] object-contain"
                      loading="lazy"
                    />
                  );
                  return (
                    <div key={sponsor.id} className="flex items-center justify-center w-72 h-40">
                      {sponsor.linkUrl ? (
                        <a
                          href={sponsor.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={sponsor.name}
                        >
                          {logo}
                        </a>
                      ) : logo}
                    </div>
                  );
                })
              : Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-72 h-40 bg-gray-100 rounded-lg border border-dashed border-gray-200"
                  />
                ))
            }
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-6 px-6 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Spencer's Home · Built to serve every child, in every state.
        </p>
      </footer>

    </div>
  );
}
