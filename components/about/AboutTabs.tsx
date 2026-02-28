import Link from "next/link";

type AboutTabsProps = {
  active: "about";
};

export default function AboutTabs({ active }: AboutTabsProps) {
  return (
    <nav
      className="mt-4 flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 text-sm shadow-sm"
      aria-label="About section"
    >
      {active === "about" ? (
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-900">
          About Us
        </span>
      ) : (
        <Link
          className="rounded-full px-3 py-1 text-zinc-700 hover:text-zinc-900"
          href="/about-us?tab=about"
        >
          About Us
        </Link>
      )}
    </nav>
  );
}
