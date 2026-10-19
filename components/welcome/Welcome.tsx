import Image from "next/image";
import IntroText from "../intro-text/IntroText";
import NoticeContent from "@/components/notice-content/NoticeContent";
import HeroPromoVideo from "./HeroPromoVideo";
import TutorRequestForm from "./TutorRequestForm";
import type { ContentBlock, NoticeItem, StateOption } from "@/lib/php-api";

type Props = {
  initialStates?: StateOption[];
  initialWelcome?: ContentBlock | null;
  initialNotices?: NoticeItem[];
};

export default function Welcome({
  initialStates = [],
  initialWelcome = null,
  initialNotices = [],
}: Props) {
  return (
    <>
      {/*
        Desktop: heading + video | form side-by-side in one viewport.
        Mobile: primary column fills the first viewport; form stacks below the fold.
      */}
      <div className="d-flex align-items-lg-center bg-hero text-white px-3">
        <Image
          src="/images/asvab-bg.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="bg-hero-image"
          quality={70}
        />
        <div className="container hero-content">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6 text-center hero-primary-col">
              <h1 className="display-5 fw-bold">
                Welcome To <br />
                <span className="primary-color-custom">ASVAB Tutoring</span>
              </h1>

              <p className="lead mt-3">
                11,000+ successful candidates. The Best Military Enlisted and Officer Candidate Test Prep Program: ASVAB, ASTB, OAR, AFOQT, and SIFT
              </p>

              <HeroPromoVideo />
            </div>

            <div className="col-lg-6 hero-form-col">
              <TutorRequestForm initialStates={initialStates} />
            </div>
          </div>
        </div>
      </div>

      <NoticeContent initialNotices={initialNotices} />

      <IntroText initialWelcome={initialWelcome} />
    </>
  );
}
