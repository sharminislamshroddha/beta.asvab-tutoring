import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/button/Button";
import { decodeHtml } from "@/lib/decode-html";
import type { ContentBlock } from "@/lib/php-api";

type Props = {
  items: ContentBlock[];
};

export default function HowItWorksContent({ items }: Props) {
  return (
    <section>
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center">
        <h1 className="text-white mb-2 text-3xl font-bold">How It Works</h1>
        <Breadcrumb
          segments={["how-it-works"]}
          className="text-white text-base"
        />
      </div>

      <div className="container my-5">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id}>
              <h2 className="text-dark mb-3">{item.title}</h2>
              <hr className="mb-4 mt-2" />
              <div
                dangerouslySetInnerHTML={{
                  __html: decodeHtml(item.description),
                }}
              />
              <div className="text-center">
                <Button
                  pathname="/pricing/1-on-1-tutoring"
                  className="btn-primary-custom2"
                >
                  Enroll Now
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center">No content available at the moment.</p>
        )}
      </div>
    </section>
  );
}
