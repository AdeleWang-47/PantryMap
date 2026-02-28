"use client";

type AboutUsTabsProps = {
  active: "about";
  onChange: (tab: "about") => void;
};

export default function AboutUsTabs({ active, onChange }: AboutUsTabsProps) {
  return (
    <nav
      className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 text-sm shadow-sm"
      aria-label="About Us sections"
    >
      <button
        type="button"
        className={
          active === "about"
            ? "cursor-pointer rounded-full bg-emerald-50 px-3 py-1 font-medium text-neutral-900 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
            : "cursor-pointer rounded-full px-3 py-1 text-neutral-900 transition-colors hover:bg-emerald-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
        }
        onClick={() => onChange("about")}
      >
        About Us
      </button>
    </nav>
  );
}
