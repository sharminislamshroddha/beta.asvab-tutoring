import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { decodeHtml } from "@/lib/decode-html";
import type { PolicyDocument } from "@/lib/php-api";

type Props = {
  policy: PolicyDocument | null;
};

export default function PrivacyPolicyContent({ policy }: Props) {
  const pageTitle = policy?.title || "Privacy Policy";

  return (
    <section>
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl font-bold">{pageTitle}</h1>
        <Breadcrumb
          segments={["privacy-policy"]}
          dynamicTitle={pageTitle}
          className="text-white text-base mt-1"
        />
      </div>

      <div className="container mb-5">
        {policy ? (
          <div
            dangerouslySetInnerHTML={{
              __html: decodeHtml(policy.description),
            }}
          />
        ) : (
          <p className="text-muted">Privacy policy content not found.</p>
        )}
      </div>
    </section>
  );
}
