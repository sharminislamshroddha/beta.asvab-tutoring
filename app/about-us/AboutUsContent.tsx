import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { decodeHtml } from "@/lib/decode-html";
import type { ContentBlock } from "@/lib/php-api";

type Props = {
  items: ContentBlock[];
};

export default function AboutUsContent({ items }: Props) {
  return (
    <section>
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center">
        <h1 className="text-white mb-2 text-3xl font-bold">About Us</h1>
        <Breadcrumb segments={["about-us"]} className="text-white text-base" />
      </div>

      <div className="container my-5">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="mb-5">
              <h2 className="text-dark mb-3">{item.title}</h2>
              <hr className="mb-4 mt-2" />
              <div
                dangerouslySetInnerHTML={{
                  __html: decodeHtml(item.description),
                }}
              />
            </div>
          ))
        ) : (
          <p className="text-center">
            No about us information available at the moment.
          </p>
        )}
      </div>
    </section>
  );
}
