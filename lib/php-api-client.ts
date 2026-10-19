import type {
  FreePredTestScoreResponse,
  PredTestScorePayload,
} from "@/lib/prediction-test-types";

export async function calculateFreePredTestScore(
  params: PredTestScorePayload,
): Promise<FreePredTestScoreResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL;
  if (!apiUrl) {
    console.error("PHP API: NEXT_PUBLIC_PHP_API_URL not configured");
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "calculate-free-pred-test-score",
        ...params,
      }),
    });

    if (!response.ok) {
      console.error(
        `calculate-free-pred-test-score: returned ${response.status}`,
      );
      return null;
    }

    const text = await response.text();

    try {
      return JSON.parse(text) as FreePredTestScoreResponse;
    } catch {
      console.error("calculate-free-pred-test-score: invalid JSON");
      return null;
    }
  } catch (error) {
    console.error("calculate-free-pred-test-score: fetch failed", error);
    return null;
  }
}
