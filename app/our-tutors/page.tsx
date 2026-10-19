import OurTutorsContent from "./OurTutorsContent";
import { fetchTutorList } from "@/lib/php-api";

export const revalidate = 3600;

export default async function TutorsListPage() {
  const tutors = await fetchTutorList();
  return <OurTutorsContent tutors={tutors} />;
}
