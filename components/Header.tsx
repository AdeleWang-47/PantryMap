"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerBottom, setHeaderBottom] = useState(0);

  useEffect(() => {
    const update = () => {
      if (headerRef.current) {
        setHeaderBottom(headerRef.current.getBoundingClientRect().bottom);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [menuOpen]);

  const navItems = [
    { href: "/map", label: "Pantry Map" },
    { href: "/food-donation-guide", label: "Donation Guide" },
    { href: "/about-us", label: "About Us" },
  ];

  const getLinkCls = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return isActive
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : "border-zinc-200 bg-white text-neutral-900 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800";
  };

  return (
    <header ref={headerRef} className="border-b border-zinc-200 relative">
      <div className="flex w-full items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/PantryLink logo.png" alt="PantryLink" className="h-8 w-auto sm:h-10" />
          <span className="text-lg font-semibold text-zinc-900 sm:text-2xl">PantryLink</span>
        </div>

        {/* Desktop nav — hidden on small screens */}
        <nav className="hidden sm:flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none ${getLinkCls(item.href)}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Hamburger button — visible on small screens */}
        <button
          type="button"
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            /* × close icon */
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="3" x2="15" y2="15" />
              <line x1="15" y1="3" x2="3" y2="15" />
            </svg>
          ) : (
            /* ☰ hamburger icon */
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5" x2="16" y2="5" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="13" x2="16" y2="13" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown — fixed so it escapes overflow:clip parents */}
      {menuOpen && (
        <div
          className="sm:hidden fixed left-0 right-0 z-[9999] border-b border-zinc-200 bg-white shadow-md"
          style={{ top: headerBottom }}
        >
          <nav className="flex flex-col px-4 py-2 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${getLinkCls(item.href)}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
