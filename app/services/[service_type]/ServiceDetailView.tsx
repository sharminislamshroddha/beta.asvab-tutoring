import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Button from "@/components/button/Button";
import { decodeHtml } from "@/lib/decode-html";
import type { ServiceDetail } from "@/lib/php-api";

type Props = {
  data: ServiceDetail;
  serviceType: string;
};

export default function ServiceDetailView({ data, serviceType }: Props) {
  const pageTitle = data.title || "Service Detail";

  return (
    <>
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl fw-bold">{pageTitle}</h1>
        <Breadcrumb
          segments={["services", data.service_id]}
          dynamicTitle={pageTitle}
          className="text-white text-base mt-1"
        />
      </div>

      <div className="container">
        <div className="mb-4">
          <h4 className="fw-semibold">{data.course_name}</h4>
        </div>

        <div
          className="service-description"
          dangerouslySetInnerHTML={{
            __html: decodeHtml(data.description),
          }}
        />
        <div className="text-center my-4">
          <Button
            pathname={`/pricing/${serviceType}`}
            className="btn-primary-custom2"
          >
            {serviceType === "self-study" ? "Subscribe Now" : "Enroll Now"}
          </Button>
        </div>
      </div>
    </>
  );
}
