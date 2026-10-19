import { notFound } from "next/navigation";
import PredictionTestClient from "@/components/study/PredictionTestClient";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import { getStudyDashboard } from "@/lib/study-api";

export const metadata = { title: "Prediction Test" };

export default async function StudyPredictionTestPage({
  params,
}: {
  params: Promise<{ predTestId: string }>;
}) {
  const { predTestId: raw } = await params;
  const predTestId = Number(raw);
  if (!Number.isInteger(predTestId) || predTestId <= 0) notFound();

  const dashboard = await getStudyDashboard();
  const test = dashboard.ok ? dashboard.data.prediction_tests.find((t) => t.pred_test_id === predTestId) : undefined;
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "Prediction Tests", href: "/study/prediction" },
    { label: test?.name ?? "Test" },
  ];

  if (dashboard.ok && !test) notFound();

  return (
    <>
      <StudyPageHeader title={test?.name ?? "Prediction Test"} crumbs={crumbs} />
      {dashboard.ok && !dashboard.data.access.prediction_tests_enabled ? (
        <StudyNotice
          code="prediction_locked"
          message="You do not have permission to access this section yet. Please contact your instructor for assistance."
        />
      ) : dashboard.ok && !dashboard.data.access.can_take_pred_test ? (
        <StudyNotice
          code="subscription_required"
          message="You've used your free prediction test. Subscribe to take unlimited prediction tests."
        />
      ) : (
        <PredictionTestClient predTestId={predTestId} />
      )}
    </>
  );
}
