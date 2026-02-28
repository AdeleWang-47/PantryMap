"use client";

import { useState } from "react";
import Modal from "../../components/donation-guide/Modal";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import SearchBar from "@/components/donation-guide/SearchBar";
import CategoryCard from "@/components/donation-guide/CategoryCard";
import foodsDataRaw from "@/components/donation-guide/data/foods.json";
import { FoodsData } from "@/components/donation-guide/types/foods";

const cardListClassName =
  "mt-2 list-disc pl-6 space-y-2 text-sm text-black leading-6";
const faqAnswerParagraphClassName = "w-full max-w-none whitespace-normal";
const foodsData = foodsDataRaw as FoodsData;

const faqItems = [
  {
    question:
      "Will a micro-pantry/community fridge or donors be liable if someone gets sick?",
    answer: (
      <div className="space-y-2">
        <p className={faqAnswerParagraphClassName}>
          Under the federal{" "}
          <a
            href="https://www.congress.gov/bill/117th-congress/senate-bill/5329/text"
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-600 underline hover:text-blue-700 cursor-pointer"
          >
            Bill Emerson Good Samaritan Food Donation Act
          </a>
          , individuals and organizations involved in donating or distributing
          food, including individual donors, community fridge operators, mutual
          aid groups, nonprofits, businesses, and government entities, are
          generally protected from liability if someone becomes ill from donated
          food.
        </p>
        <p className={faqAnswerParagraphClassName}>
          Protections apply when food is donated in good faith, meets food
          safety requirements, and is believed to be safe at the time of
          donation. Food may still qualify for protection even if it is not
          suitable for sale, due to factors like appearance, age, or freshness.
          The Bill Emerson Act limits both civil and criminal liability,
          provided that there is not gross negligence or intentional misconduct.
          Only donate food you would serve yourself or your family. Remember -
          when in doubt, throw it out.
        </p>
        <p className={faqAnswerParagraphClassName}>
          For more information, see{" "}
          <a
            href="https://chlpi.org/wp-content/uploads/2022/01/Fridge-QA-FINAL.pdf"
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-600 underline hover:text-blue-700 cursor-pointer"
          >
            Harvard’s Legal Questions and Answers on Community Fridges
          </a>
        </p>
      </div>
    ),
  },
  {
    question: "Can I donate food past best-by or use-by dates?",
    answer: (
      <div className="space-y-2">
        <p className={faqAnswerParagraphClassName}>
          Often. Many best-by and use-by dates do not indicate when the food
          item is no longer safe for consumption. Grocery stores and restaurants
          use these dates to make quality determinations, such as when to pull
          items from their shelves. Items beyond these dates CAN be donated if
          the food is wholesome and appears to be in good condition. The one
          exception is infant formula; best-by dates DO apply as a safety date,
          since it is often the only nutrition for infants. See below for
          further clarification on various best-by and use-by dates.
        </p>
        <ul className={cardListClassName}>
          <li>
            <strong>“Best if Used By/Before”:</strong> dates indicate when a
            product will be of best flavor or quality. It is not a purchase or
            safety date.
          </li>
          <li>
            <strong>“Sell-By”:</strong> dates tell the store how long to display
            the product for sale for inventory management. It is also not a
            safety date.
          </li>
          <li>
            <strong>“Use-By”</strong> dates are the last date recommended for
            the use of the product while at peak quality. It is not a safety
            date except for when used on infant formula.
          </li>
          <li>
            <strong>“Freeze-By”</strong> dates indicate when a product should be
            frozen to maintain peak quality. Again, it is not a purchase or
            safety date.
          </li>
        </ul>
        <p className={faqAnswerParagraphClassName}>
          For more information, see{" "}
          <a
            href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating"
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-600 underline hover:text-blue-700 cursor-pointer"
          >
            the USDA Food Product Dating webpage
          </a>
        </p>
      </div>
    ),
  },
  {
    question:
      "Why are homemade baked goods acceptable but other homemade foods are not?",
    answer: (
      <p className={faqAnswerParagraphClassName}>
        Baked goods are typically not temperature sensitive and have a low risk
        of causing foodborne illness compared to other food items.
      </p>
    ),
  },
  {
    question: "How should I prepare homemade baked goods?",
    answer: (
      <p className={faqAnswerParagraphClassName}>
        Follow the safe food handling and preparation guidance outlined on the{" "}
        <a
          href="https://doh.wa.gov/community-and-environment/food/food-worker-and-industry/charity-food-donations"
          target="_blank"
          rel="noreferrer noopener"
          className="text-black hover:underline underline-offset-2"
        >
          Washington Department of Health&apos;s Charity Food Donations webpage
        </a>
        .
      </p>
    ),
  },
  {
    question:
      "How should I package and label baked goods or donor-kitchen prepared food?",
    answer: (
      <div className="space-y-2">
        <p className={faqAnswerParagraphClassName}>
          While most micropantries and community fridges do not accept homemade
          meals, many accept meals prepared in a donor kitchen. According to the
          Washington Department of Health, “a donor kitchen is a publicly
          available kitchen in a faith-based organization, community center, or
          other site. The donor kitchen does not need to have a health permit,
          but must have basic facilities such as adequate handwashing,
          dishwashing, refrigeration, and cooking equipment. It must have a safe
          water supply, be protected from weather and animals, and be cleaned
          before food preparation starts.”
        </p>
        <p className={faqAnswerParagraphClassName}>
          Many people have food allergies that can cause a severe reaction.
          Common causes of allergic reactions are peanuts, tree nuts, eggs, soy,
          wheat, seafood, and milk products. To help protect the safety of food
          recipients, it is best to provide a list of all the ingredients in any
          food you prepare. Maintain original labels on donated commercially
          packaged foods. If bulk food staples (such as flour, sugar, dry beans,
          dry grains) are repackaged for donation, the common name of the food
          should be written on each package.
        </p>
        <p className={faqAnswerParagraphClassName}>
          Recommended food label should include:
        </p>
        <ul className={cardListClassName}>
          <li>
            <strong>Name of the dish</strong>
          </li>
          <li>
            <strong>Date it was made</strong>
          </li>
          <li>
            <strong>Location where it was made</strong>
          </li>
          <li>
            <strong>All ingredients and potential allergens</strong>
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "How should food be safely transported?",
    answer: (
      <p className={faqAnswerParagraphClassName}>
        Transport temperature-sensitive foods in clean, insulated containers and
        return to refrigeration within two hours.
      </p>
    ),
  },
  {
    question: "How should food be stored?",
    answer: (
      <div className="space-y-2">
        <p className={faqAnswerParagraphClassName}>
          Temperature-sensitive foods should only be donated at micropantry
          sites with a working refrigerator.
        </p>
        <p className={faqAnswerParagraphClassName}>
          To prevent cross-contamination, store raw meat and eggs on the bottom
          shelf of the fridge and separate them from ready-to-eat foods.
        </p>
      </div>
    ),
  },
];

export default function FoodDonationGuideLandingPage() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [openFaqQuestions, setOpenFaqQuestions] = useState<Set<string>>(
    new Set()
  );
  const heroButtonClassName =
    "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm cursor-pointer [transition:background-color_150ms_ease,border-color_150ms_ease,color_150ms_ease] hover:border-emerald-300 hover:bg-emerald-100 active:border-emerald-400 active:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
  const cardBaseClassName =
    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
  const faqCardClassName = "rounded-2xl border border-gray-100 bg-white p-5";
  const guidanceCardClassName =
    "rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm";
  const guidanceLabelClassName = "text-base font-semibold text-black";
  const resources = [
    {
      title: "Washington Department of Health — Charity Food Donations",
      href: "https://doh.wa.gov/community-and-environment/food/food-worker-and-industry/charity-food-donations",
      description:
        "State guidance on safe food donation practices and compliance.",
    },
    {
      title: "USDA FSIS — Food Product Dating",
      href: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating",
      description:
        "Federal guidance on best-by, sell-by, and use-by dates.",
    },
    {
      title: "Bill Emerson Good Samaritan Food Donation Act",
      href: "https://www.congress.gov/bill/117th-congress/senate-bill/5329/text",
      description:
        "Federal law text on liability protections for food donations.",
    },
    {
      title: "Free Fridge / Community Fridge Q&A",
      href: "https://chlpi.org/wp-content/uploads/2022/01/Fridge-QA-FINAL.pdf",
      description:
        "Common questions and answers about community fridge operations.",
    },
    {
      title: "Donor Guidelines for Freedge",
      href: "https://sustainableconnections.org/wp-content/uploads/Donor-Guidelines-for-Freedge.pdf",
      description: "Donor-facing guidelines for safe items and handling.",
    },
    {
      title: "Freedge Manual",
      href: "https://sustainableconnections.org/wp-content/uploads/Freedge-Manual-for-Webpage.pdf",
      description: "Operational guidance for running and maintaining a freedge.",
    },
    {
      title: "NCR FSMA — Free Fridge / LFSC Updated Guidance",
      href: "https://www.ncrfsma.org/files/page/files/freefridge_lfsc_updated.pdf",
      description: "Updated safety guidance for free fridges and LFSC sites.",
    },
    {
      title: "WA DOH Publication 333-241",
      href: "https://doh.wa.gov/sites/default/files/legacy/Documents/Pubs/333-241.pdf",
      description:
        "State handout on safe food handling and donation practices.",
    },
    {
      title: "WA DOH Publication 333-248",
      href: "https://doh.wa.gov/sites/default/files/legacy/Documents/Pubs//333-248.pdf",
      description:
        "State handout on safe food storage and temperature guidance.",
    },
    {
      title: "WA DOH Publication 333-257",
      href: "https://doh.wa.gov/sites/default/files/legacy/Documents/Pubs//333-257.pdf",
      description:
        "State handout on labeling, allergens, and donation safety tips.",
    },
  ];

  const handleFaqClick = () => {
    const target = document.getElementById("faq");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
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
  const handleResultClick = (_categoryId: string) => {};

  const guideModal = (
    <Modal
      isOpen={isGuideOpen}
      onClose={() => setIsGuideOpen(false)}
      contentClassName="max-w-5xl bg-emerald-50"
    >
      <div className="sticky top-0 bg-emerald-50 border-b border-gray-200 p-6 flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">How to Use This Guide</h2>
          <p className="text-sm text-black">
            This page walks you through the key sections below, from quick
            preparation tips to quick guidance, FAQs, and resources.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsGuideOpen(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6 space-y-6">
        <ul className="list-disc list-inside space-y-4 text-sm leading-7 text-black">
          <li>
            <strong>How to Donate (Quick Steps):</strong> A short checklist to
            prepare safe, shelf-stable donations.
          </li>
          <li>
            <strong>Food Safety Basics:</strong> Temperature, timing, and
            handling rules to reduce risk.
          </li>
          <li>
            <strong>Labeling Basics:</strong> What information to write so
            others can make safe choices.
          </li>
          <li>
            <strong>FAQ:</strong> Expand questions to see clear answers to
            common donation concerns.
          </li>
          <li>
            <strong>Resources:</strong> Official guidelines and reference
            documents used in this guide.
          </li>
          <li>
            <strong>Item Look-Up:</strong> A separate page where
            you can search or browse categories to check a specific item before
            donating.
          </li>
        </ul>
      </div>
    </Modal>
  );

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <section className="mb-10 relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white p-4 shadow-sm md:p-5">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-neutral-900">
              Donation Guide
            </h1>
            <p className="mt-1 max-w-xl text-base text-black">
              Learn best practices for donating to a micropantry or community
              fridge and use the item look-up feature to learn more about
              specific food items.
            </p>

            <div className="mt-2">
              <p className={guidanceLabelClassName}>Start here:</p>
              <nav
                aria-label="Donation guide sections"
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                <a href="#overview" className={heroButtonClassName}>
                  Overview
                </a>
                <a href="#quick-guidance" className={heroButtonClassName}>
                  Quick Guidance
                </a>
                <a href="#item-look-up" className={heroButtonClassName}>
                  Item Look-Up
                </a>
                <a href="#faq" className={heroButtonClassName}>
                  FAQ
                </a>
                <a href="#resources" className={heroButtonClassName}>
                  Resources
                </a>
              </nav>
            </div>
          </div>
        </section>

        <section id="overview" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-semibold text-black">Overview</h2>
          <div className={`${guidanceCardClassName} mt-4 w-full`}>
            <div className="space-y-3 text-sm leading-6 text-black">
              <p>
                Most micro-pantries and community fridges welcome donations from
                community members. Many types of foods can be donated, including
                certain items found in your pantry and refrigerator, produce
                grown in your garden, and foods purchased at the store. However,
                it is important to follow safe food handling practices to
                ensure micro-pantries and community fridges offer safe food for
                all. The guidelines below are intended to be used by donors to
                determine which foods to donate and how donated foods should be
                labeled, transported, and stored.
              </p>
              <p>
                It is important to note that the following food safety guidance
                is just that – guidance.{" "}
                <strong>
                  When in doubt, consider whether you would feed the food item
                  to members of your own family.
                </strong>{" "}
                Sometimes, composting the food is the safest option. Your local
                micro-pantry or community fridge may also provide their own
                donation guidelines to ensure food safety at their sites. Please
                follow any site-specific policies when donating.
              </p>
            </div>
          </div>
        </section>

        <section id="quick-guidance" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-semibold text-black">
            Quick Guidance
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div className={guidanceCardClassName}>
              <h3 className="text-lg font-semibold text-black mt-0 mb-4">
                Store-bought foods
              </h3>
              <p className="text-sm text-black leading-6">
                Store-bought foods should be unopened, maintained at proper
                temperatures, and donated in their original packaging.
              </p>
            </div>

            <div className={guidanceCardClassName}>
              <h3 className="text-lg font-semibold text-black mt-0 mb-4">
                Whole/raw produce
              </h3>
              <p className="text-sm text-black leading-6">
                Whole/raw produce from the store or grown in your garden can be
                donated. Ready-to-eat produce (such as salad mixes or cut fruit
                trays) purchased from the store can be donated if unopened,
                maintained at proper temperatures, and donated in their original
                packaging.
              </p>
            </div>

            <div className={guidanceCardClassName}>
              <h3 className="text-lg font-semibold text-black mt-0 mb-4">
                Homemade baked goods
              </h3>
              <p className="text-sm text-black leading-6">
                Homemade baked goods that do not need refrigeration (such as
                cookies, cakes, pies, and breads) are welcome, but should be
                individually packaged and labeled.
              </p>
            </div>
          </div>
        </section>

      <section id="item-look-up" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-black">Item Look-Up</h2>
        <div className="mt-4 max-w-2xl mx-auto">
          <p className="mb-2 text-base font-normal text-slate-900">
            Search for an item to see whether it’s generally suitable for
            donation.
          </p>
          <SearchBar
            foodsData={foodsData}
            onResultClick={handleResultClick}
            emphasizeInput
            showCheckWithSiteDisclaimer
          />
        </div>
        <p className="mt-2 text-base font-normal text-slate-900">
          Click a category card below to see examples, considerations, and
          storage requirements.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {foodsData.categories.map((category) => (
            <div key={category.id}>
              <CategoryCard
                category={category}
                showCheckWithSiteDisclaimer
              />
            </div>
          ))}
        </div>
      </section>

      <section id="food-safety-essentials" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-black">Food Safety Essentials</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div className={guidanceCardClassName}>
            <h3 className="text-lg font-semibold text-black mt-0 mb-4">
              Temperature Control
            </h3>
            <p className="text-sm text-black leading-6">
              Donated foods that require temperature control must remain at 41˚F or below. When refrigerated transport is available, foods should be kept below 41˚F during transport to the venue. If refrigerated transport is not available, the food items should be labeled “Process Immediately” and must not be out of temperature controls for more than two (2) hours.
            </p>
            <div className="mt-4 flex justify-center">
              <div className="overflow-hidden rounded-xl border-0 bg-transparent shadow-none outline-none">
                <img
                  src="/food-safety-temperature-control.png"
                  alt="Temperature control guidance graphic"
                  className="h-auto w-full max-w-[130px] rounded-xl border-0 bg-transparent object-contain shadow-none"
                />
              </div>
            </div>
          </div>

          <div className={guidanceCardClassName}>
            <h3 className="text-lg font-semibold text-black mt-0 mb-4">
              Protection from Contamination
            </h3>
            <p className="text-sm text-black leading-6">
              Food must be protected from potential contamination. Enhanced sanitary practices, food-grade containers, and protocols ensuring that transport vehicles are clean. Canned goods must be from a commercial source (with intact label) and in good condition. Punctured, bulging, swollen, or seriously damaged cans/packaging should not be donated.
            </p>
          </div>

          <div className={guidanceCardClassName}>
            <h3 className="text-lg font-semibold text-black mt-0 mb-4">Verify your donation</h3>
            <p className="text-sm text-black leading-6">
              Use the item look-up tool above to make sure that the food you want to donate is acceptable. Your local micro-pantry or community fridge may also provide their own donation guidelines to ensure food safety at their sites. Please follow any site-specific policies when donating.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-neutral-900">FAQ</h2>
        <div className="mt-4 space-y-3">
          {faqItems.map((faq, index) => (
            <div key={faq.question} className={faqCardClassName}>
              <button
                type="button"
                onClick={() => toggleFaqQuestion(faq.question)}
                className="flex w-full items-center justify-between gap-3 text-left cursor-pointer text-base font-semibold text-black"
                aria-expanded={openFaqQuestions.has(faq.question)}
                aria-controls={`faq-answer-${index}`}
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
                  id={`faq-answer-${index}`}
                  className="mt-2 w-full max-w-none whitespace-normal text-sm text-black leading-6"
                >
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="resources" className="resourcesSection mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-black">Resources</h2>
        <p className="max-w-2xl text-sm text-black">
          Official guidelines and reference documents used in this guide (opens
          in a new tab).
        </p>
        <div className={`${cardBaseClassName} mt-4`}>
          <ul className={`${cardListClassName} resourcesList`}>
            {resources.map((resource) => (
              <li key={resource.href}>
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="resourceTitleLink resourceTitle font-semibold"
                >
                  {resource.title}
                  <span className="resourceExternalIcon" aria-hidden="true">
                    ↗
                  </span>
                </a>
                <p className="resourceDescription mt-0 text-sm">
                  {resource.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </main>
      <style jsx>{`
        .resourcesSection .resourcesList > li + li {
          margin-top: 0.375rem;
        }

        .resourcesSection .resourceExternalIcon {
          margin-left: 0.15em;
          font-size: 0.75em;
        }
      `}</style>
      {guideModal}
    </>
  );
}