"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Gift,
  MapPinPlus,
  Search,
  Share2,
  ChevronDown,
  ChevronRight,
  Users,
  Warehouse,
  LayoutGrid,
  Wrench,
  Map,
  Activity,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import PartnerLogos from "@/components/PartnerLogos";
import WifiBadgeIcon from "@/components/WifiBadgeIcon";

const actions = [
  {
    icon: Search,
    title: "Explore",
    desc: "Find micro-pantries near you on our interactive map.",
    cta: "Open Map",
    href: "/map",
    comingSoon: false,
    external: false,
  },
  {
    icon: Gift,
    title: "Donate",
    desc: "Check our donation guidelines and contribute to a local pantry.",
    cta: "Donation Guide",
    href: "/food-donation-guide",
    comingSoon: false,
    external: false,
  },
  {
    icon: MapPinPlus,
    title: "Update",
    desc: "Submit updates or report issues related to micro-pantries. Submissions are reviewed before changes go live.",
    cta: "Open Form",
    href: "/update",
    comingSoon: false,
    external: false,
  },
  {
    icon: Share2,
    title: "Share",
    desc: "Tell your neighbors about local micro-pantries and spread the word.",
    cta: "Share",
    href: "#",
    comingSoon: false,
    external: false,
  },
];

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "Are micro-pantries open to everyone?",
    answer:
      "Yes. Micro-pantries are “take what you need, leave what you can.” No sign-up is required.",
  },
  {
    question: "What can I donate?",
    answer: (
      <>
        See{" "}
        <Link
          href="/food-donation-guide"
          className="font-semibold text-[#166534] underline underline-offset-[3px] decoration-[1px] [text-decoration-skip-ink:auto] hover:text-[#14532d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
        >
          Donation Guide
        </Link>
        .
      </>
    ),
  },
  {
    question: "Can I take items if I don’t donate?",
    answer:
      "Yes. Micro-pantries exist to support neighbors. Take what you need, and consider leaving something later if you can.",
  },
  {
    question: "How much should I take?",
    answer: "Take what you need for now and leave enough for others if you can.",
  },
  {
    question: "How do I know if a pantry is active or stocked?",
    answer: (
      <>
        Stock levels change frequently. If a pantry looks low, that’s a great
        time to donate shelf-stable items. If you notice a pantry that appears
        inactive or needs attention, you can submit an update using the{" "}
        <Link
          href="#update-report-issue"
          className="font-semibold text-[#166534] underline underline-offset-[3px] decoration-[1px] [text-decoration-skip-ink:auto] hover:text-[#14532d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
        >
          Update &amp; Report Issue
        </Link>
        .
      </>
    ),
  },
  {
    question: "How do I report an issue or suggest a new pantry location?",
    answer: (
      <>
        Use the{" "}
        <Link
          href="#update-report-issue"
          className="font-semibold text-[#166534] underline underline-offset-[3px] decoration-[1px] [text-decoration-skip-ink:auto] hover:text-[#14532d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
        >
          Update &amp; Report Issue
        </Link>
        . Submissions are reviewed by the project team before any changes appear
        on the map.
      </>
    ),
  },
  {
    question: "Will information change over time?",
    answer:
      "Yes. Pantry availability and guidelines can change. We review updates regularly, and the Donation Guide may be refined based on partner feedback.",
  },
  {
    question: "Is this tool the only source of guidance?",
    answer:
      "No. Some pantries may post on-site guidelines. When local guidance differs, please follow the pantry’s posted instructions and use this tool as a general reference.",
  },
];

type AboutUsClientProps = {
  initialTab?: "about";
};

export default function AboutUsClient({ initialTab }: AboutUsClientProps) {
  const [activeTab] = useState<"about">(initialTab ?? "about");
  const [openFaqQuestions, setOpenFaqQuestions] = useState<Set<string>>(
    new Set()
  );

  const primaryButtonClassName =
    "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm cursor-pointer [transition:background-color_150ms_ease,border-color_150ms_ease,color_150ms_ease] hover:border-emerald-300 hover:bg-emerald-100 active:border-emerald-400 active:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
  const faqCardClassName = "rounded-2xl border border-gray-100 bg-white p-5";
  const toggleFaqQuestion = (question: string) => {
    setOpenFaqQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div className="md:flex md:min-h-[268px] md:flex-col md:justify-between">
            {activeTab === "about" ? (
              <>
                <h1 className="text-3xl font-semibold leading-tight text-neutral-900">
                  A community portal supporting
                  <br />
                  food sharing among neighbors
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-900 md:mt-[24px]">
                  This portal connects people to{" "}
                  <strong>community micro-pantries and fridges</strong> in the
                  Puget Sound region so food can move quickly from neighbors who
                  have extra to neighbors who need it.
                </p>
                <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:gap-[56px] md:mt-[48px] md:ml-[64px]">
                  <Link
                    className={primaryButtonClassName}
                    href="/map"
                  >
                    Find a pantry
                  </Link>
                  <Link
                    className={primaryButtonClassName}
                    href="/food-donation-guide"
                  >
                    How to donate
                  </Link>
                </div>
              </>
            ) : null}
          </div>
          <div className="relative flex items-center justify-center">
            <img
              src="/about-hero-pantry.png"
              alt="Little Free Pantry"
              className="h-auto w-full max-w-[13.5rem] rounded-2xl border border-emerald-200 object-cover shadow-sm sm:max-w-[15rem] md:max-w-[11.25rem]"
            />
          </div>
        </div>
      </section>

      <>
          <section className="mx-auto mt-10 w-full space-y-6">
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
                <Users className="h-5 w-5 text-[#166534]" aria-hidden="true" />
                Who we are
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-900">
                We are a research team at the University of Washington collaborating
                with community partners to study how neighborhood micro-pantries
                support local food sharing. By working closely with communities,
                we aim to learn what helps community micro-pantries thrive and
                how they can be better supported. This project is sponsored by
                the National Science Foundation Civic Innovation Challenge.
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
                <Warehouse className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                What are community micro-pantries?
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-900">
                Micro-pantries are independent, open-access, food pantries and
                fridges hosted on the public right-of-way and maintained by
                community members and local organizations. Neighbors and local
                businesses can leave food, and anyone who needs food can take
                what they need.
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
                <LayoutGrid className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                What this portal does
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-900">
                This portal helps connect people to nearby micro-pantries and
                shows what’s happening at each location in real time. Key
                features include:
              </p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-[rgba(22,101,52,0.18)] bg-[rgba(255,255,255,0.72)] p-4 text-sm text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                    <Map className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    Interactive map
                  </h3>
                  <p className="mt-2 leading-6">
                    Find community micro-pantries near you through an interactive
                    web map.
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(22,101,52,0.18)] bg-[rgba(255,255,255,0.72)] p-4 text-sm text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                    <Activity className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    Real-time stock level updates
                  </h3>
                  <p className="mt-2 leading-6">
                    Selected micro-pantries have been retrofitted with low-impact
                    sensors to automatically detect the weight of food donated
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(22,101,52,0.18)] bg-[rgba(255,255,255,0.72)] p-4 text-sm text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                    <BookOpen className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    Donation resources
                  </h3>
                  <p className="mt-2 leading-6">
                    A user-friendly guide provides you with resources to decide
                    how, what, and when to donate
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(22,101,52,0.18)] bg-[rgba(255,255,255,0.72)] p-4 text-sm text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                    <MessageSquare className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    Pantry message board
                  </h3>
                  <p className="mt-2 leading-6">
                    Pantry-specific pages allow you to report a donation or add
                    items to the wishlist
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
                <BookOpen className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                How to use this portal
              </h2>
              <div className="mt-4 grid items-stretch gap-5 md:grid-cols-2">
                <div className="flex flex-col">
                  <h3 className="text-base font-semibold text-neutral-900">
                    I want to donate food:
                  </h3>
                  <div className="mt-3 h-full rounded-xl border border-[rgba(22,101,52,0.18)] bg-[rgba(255,255,255,0.72)] p-5 text-sm text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                    <ol className="list-decimal space-y-2 pl-5 leading-6">
                      <li>
                        Learn what to donate in the DONATION GUIDE
                      </li>
                      <li>
                        Find a pantry near you through the LIVE MAP
                      </li>
                      <li>
                        Click on a pantry, and check if it is running low on stock
                      </li>
                      <li>
                        Leave a donation! Note that pantries with the{" "}
                        <WifiBadgeIcon /> symbol will automatically update the stock level!
                      </li>
                      <li>
                        By clicking “report a donation” on a pantry page, you can let your neighbors know what you donated and take a picture!
                      </li>
                    </ol>
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-semibold text-neutral-900">
                    I’m looking for food:
                  </h3>
                  <div className="mt-3 h-full rounded-xl border border-[rgba(22,101,52,0.18)] bg-[rgba(255,255,255,0.72)] p-5 text-sm text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                    <ol className="list-decimal space-y-2 pl-5 leading-6">
                      <li>
                        Find a pantry near you through the LIVE MAP
                      </li>
                      <li>
                        Click on a pantry, and check if someone donated recently, or the pantry has medium to high stock level. Note that pantries with the{" "}
                        <WifiBadgeIcon /> symbol will automatically update the stock level when someone donate!
                      </li>
                      <li>
                        Not finding what you want? Add items you need in to pantry page wishlist
                      </li>
                      <li>
                        Leave a kind message to your neighbors :-)
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </article>

            <article
              id="update-report-issue"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-7"
            >
              <h2 className="flex items-center gap-2 text-xl font-semibold text-neutral-900">
                <Wrench className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                Update & Report Issue
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-900">
                If you notice an issue or have an update, use this form to report it—add a pantry, remove a pantry, or flag damaged equipment.
              </p>
              <Link
                href="/update"
                className={`mt-4 inline-flex items-center justify-center ${primaryButtonClassName}`}
              >
                Update & Report Issue
              </Link>
            </article>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold text-neutral-900">
              Partners
            </h2>
            <div className="mt-4">
              <PartnerLogos />
            </div>
          </section>

          <section className="mt-10 max-w-3xl">
            <h2 className="text-xl font-semibold text-neutral-900">FAQ</h2>
            <div className="mt-4 space-y-3">
              {faqs.map((faq, index) => (
                <div key={faq.question} className={faqCardClassName}>
                  <button
                    type="button"
                    onClick={() => toggleFaqQuestion(faq.question)}
                    className="flex w-full items-center justify-between gap-3 text-left cursor-pointer text-base font-semibold text-black"
                    aria-expanded={openFaqQuestions.has(faq.question)}
                    aria-controls={`about-faq-answer-${index}`}
                  >
                    <span>{faq.question}</span>
                    {openFaqQuestions.has(faq.question) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  {openFaqQuestions.has(faq.question) && (
                    <div
                      id={`about-faq-answer-${index}`}
                      className="mt-2 w-full max-w-none whitespace-normal text-sm text-black leading-6"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
      </>
    </main>
  );
}
