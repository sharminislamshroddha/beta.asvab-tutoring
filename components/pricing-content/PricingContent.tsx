"use client";

import { useEffect, useState } from "react";
import { decodeHtml } from "@/lib/decode-html";
import type { PricingPageItem } from "@/lib/php-api";

export default function PricingContent({
  submenu,
  initialItems,
}: {
  submenu: string;
  initialItems?: PricingPageItem[];
}) {
  const [items, setItems] = useState<PricingPageItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);

  useEffect(() => {
    if (initialItems !== undefined) {
      return;
    }

    async function load() {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            action: "specific-get-pricing-page-content",
            submenu,
          }),
        });

        const data = await res.json();

        if (data?.isSuccess && Array.isArray(data.data)) {
          setItems(data.data);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error("Pricing fetch failed:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [submenu, initialItems]);

  if (loading) {
    return <p className="text-center py-5">Loading pricing content…</p>;
  }

  if (!items.length) {
    return (
      <p className="text-center py-5">
        No pricing information available at the moment.
      </p>
    );
  }

  return (
    <div className="container pt-5">
      {items.map((item) => (
        <div key={item.pricing_id} className="mb-5">
          <h2 className="text-dark mb-3 fw-bold">{item.title}</h2>
          <hr className="mb-4 mt-2" />
          <div
            className="mb-3 service-description"
            dangerouslySetInnerHTML={{
              __html: decodeHtml(item.description),
            }}
          />
          {item.closing_content && (
            <div
              dangerouslySetInnerHTML={{
                __html: decodeHtml(item.closing_content),
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
