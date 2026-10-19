import type { Metadata } from "next";
import Faq from "@/components/faq/Faq";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { faqMetadata } from "@/lib/page-metadata";
import { fetchFaqs } from "@/lib/php-api";

export const metadata: Metadata = faqMetadata();
export const revalidate = 3600;

export default async function FaqPage() {
  const faqs = await fetchFaqs();

  return (
    <section className="bg-light">
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl font-bold">FAQ</h1>
        <Breadcrumb segments={["faq"]} className="text-white text-base mt-1" />
      </div>

      <main>
        <Faq initialFaqs={faqs} />
      </main>
    </section>
  );
}
