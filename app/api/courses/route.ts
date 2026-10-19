import { NextResponse } from "next/server";
import { fetchPublishableCourses } from "@/lib/php-api";

export const revalidate = 3600;

export async function GET() {
  const courses = await fetchPublishableCourses();

  return NextResponse.json(
    {
      isSuccess: true,
      data: courses,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
