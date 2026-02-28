import { Suspense } from "react";
import AboutUsClient from "@/components/about/AboutUsClient";

type AboutUsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AboutUsPage({ searchParams }: AboutUsPageProps) {
  await searchParams;
  const initialTab = "about";

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AboutUsClient initialTab={initialTab} />
    </Suspense>
  );
}
