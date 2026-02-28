export const CHECK_WITH_SITE_CATEGORY_ID = "check-with-site";
export const RAW_MEAT_SUBCATEGORY_ID = "raw-meat";
export const HYGIENE_ITEMS_SUBCATEGORY_ID = "hygiene-items";
export const CHECK_WITH_SITE_POLICY_REMINDER =
  "Your local micro-pantry or community fridge may not accept this type of item. Please follow any site-specific policies when donating.";

interface CheckWithSiteConsiderationParams {
  considerations: string;
  subcategoryId?: string;
  subcategoryTitle?: string;
}

export function isCheckWithSiteCategory(categoryId?: string): boolean {
  return categoryId === CHECK_WITH_SITE_CATEGORY_ID;
}

export function getCheckWithSiteConsiderationBullets({
  considerations,
  subcategoryId,
  subcategoryTitle,
}: CheckWithSiteConsiderationParams): string[] {
  const isRawMeat =
    subcategoryId === RAW_MEAT_SUBCATEGORY_ID ||
    subcategoryTitle?.trim().toLowerCase() === "raw meat";

  if (isRawMeat) {
    return [
      "Original, unopened packaging",
      "Some sites may require raw meat to be frozen.",
      CHECK_WITH_SITE_POLICY_REMINDER,
    ];
  }

  if (subcategoryId === HYGIENE_ITEMS_SUBCATEGORY_ID) {
    const noteIndex = considerations.indexOf("Note:");
    if (noteIndex !== -1) {
      const main = considerations.slice(0, noteIndex).trim().replace(/\.$/, "");
      const note = considerations.slice(noteIndex).trim();
      return [main, note, CHECK_WITH_SITE_POLICY_REMINDER].filter(Boolean);
    }
  }

  return [considerations, CHECK_WITH_SITE_POLICY_REMINDER].filter(Boolean);
}
