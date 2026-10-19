import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { decodeHtml } from "@/lib/decode-html";
import type { PolicyDocument } from "@/lib/php-api";

type Props = {
  terms: PolicyDocument | null;
};

export default function TermsOfServiceContent({ terms }: Props) {
  const pageTitle = terms?.title || "Terms of Service";

  return (
    <section>
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl font-bold">{pageTitle}</h1>
        <Breadcrumb
          segments={["terms-of-service"]}
          dynamicTitle={pageTitle}
          className="text-white text-base mt-1"
        />
      </div>

      <div className="container mb-5">
        {terms ? (
          <div
            dangerouslySetInnerHTML={{
              __html: decodeHtml(terms.description),
            }}
          />
        ) : (
          <p className="text-muted">
            Terms of Service content is not available at the moment.
          </p>
        )}
      </div>
    </section>
  );
}
