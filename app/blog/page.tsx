import BlogListClient from "./BlogListClient";
import { fetchBlogList } from "@/lib/php-api";

export const revalidate = 3600;

export default async function BlogListPage() {
  const { blogs, totalPages } = await fetchBlogList(1);

  return (
    <BlogListClient initialBlogs={blogs} initialTotalPages={totalPages} />
  );
}
