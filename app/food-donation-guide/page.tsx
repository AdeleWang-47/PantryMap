"use client";

import { useState } from "react";
import Modal from "../../components/donation-guide/Modal";
import { X } from "lucide-react";
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
        Food should be transported in a way that prevents unsafe temperature
        changes and cross-contamination. Temperature-sensitive foods should be
        moved quickly in insulated, clean containers, kept sealed when possible,
        and returned to refrigeration within two hours.
      </p>
    ),
  },
  {
    question: "How should food be stored?",
    answer: (
      <ul className={cardListClassName}>
        <li>
          Certain foods, called time/temperature control for safety foods,
          should only be donated at micropantry sites with a working
          refrigerator.
        </li>
        <li>
          Temperature-sensitive foods include items such as meats, poultry,
          fish, eggs, dairy products, tofu, all cooked vegetables (including
          cooked beans, rice, and potatoes), seed sprouts, sliced melons, garlic
          and other fresh herbs in oil mixtures. It is important to keep these
          foods at safe temperatures (at 41°F or below) to prevent bacteria from
          growing.
        </li>
        <li>
          To prevent cross-contamination, store raw meat and eggs on the bottom
          shelf of the fridge and separate them from ready-to-eat foods.
        </li>
      </ul>
    ),
  },
];

export default function FoodDonationGuideLandingPage() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showAllResources, setShowAllResources] = useState(false);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const heroButtonClassName =
    "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2";
  const cardBaseClassName =
    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
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
              Learn the basics of donating thoughtfully, then use the tool to
              check a specific item or category.
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
                is just that – guidance. When in doubt, consider whether you
                would feed the food item to members of your own family.
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
          <p className={`${guidanceLabelClassName} max-w-2xl`}>
            Donation Tips:
          </p>
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
          />
        </div>
        <p className="mt-2 text-base font-normal text-slate-900">
          Click a category card below to see examples, considerations, and
          storage requirements.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {foodsData.categories.map((category) => (
            <div key={category.id}>
              <CategoryCard category={category} />
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-neutral-900">FAQ</h2>
        <div className="mt-4 space-y-3">
          {(showAllFaqs ? faqItems : faqItems.slice(0, 3)).map((faq) => (
            <details key={faq.question} className={cardBaseClassName}>
              <summary className="cursor-pointer text-base font-semibold text-black">
                {faq.question}
              </summary>
              <div className="mt-2 w-full max-w-none whitespace-normal text-sm text-black leading-6">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
        {faqItems.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllFaqs((prev) => !prev)}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-black hover:underline underline-offset-2"
            aria-expanded={showAllFaqs}
          >
            {showAllFaqs ? "Show fewer FAQs" : "Show all FAQs"}
            <span aria-hidden="true">{showAllFaqs ? "▲" : "▼"}</span>
          </button>
        )}
      </section>

      <section id="resources" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-black">Resources</h2>
        <p className="max-w-2xl text-sm text-black">
          Official guidelines and reference documents used in this guide (opens
          in a new tab).
        </p>
        <div className={`${cardBaseClassName} mt-4`}>
          <ul className={cardListClassName}>
            {(showAllResources ? resources : resources.slice(0, 4)).map(
              (resource) => (
                <li key={resource.href}>
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-black hover:underline underline-offset-2"
                  >
                    {resource.title}
                  </a>
                  <p className="mt-1 text-sm text-black">
                    {resource.description}
                  </p>
                </li>
              )
            )}
          </ul>
          <button
            type="button"
            onClick={() => setShowAllResources((prev) => !prev)}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-black hover:underline underline-offset-2"
            aria-expanded={showAllResources}
          >
            {showAllResources ? "Show fewer resources" : "Show all resources"}
            <span aria-hidden="true">
              {showAllResources ? "▲" : "▼"}
            </span>
          </button>
        </div>
      </section>

    </main>
      {guideModal}
    </>
  );
}