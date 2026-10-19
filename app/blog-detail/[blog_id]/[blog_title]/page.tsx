import { Metadata } from "next";
import { notFound } from "next/navigation";
import { isKnownBlogId } from "@/lib/known-route-validation";
import BlogDetailClient from "./BlogDetailClient";
import {
  blogDetailMetadata,
  BLOG_DETAIL_FALLBACK_SEO,
} from "@/lib/page-metadata";
import { fetchBlogDetails } from "@/lib/php-api";

type Props = {
  params: Promise<{ blog_id: string; blog_title: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { blog_id, blog_title } = await params;

  try {
    const blog = await fetchBlogDetails(blog_id);

    if (blog) {
      const description =
        blog.blog_content
          ?.replace(/<[^>]*>/g, "")
          ?.slice(0, 160)
          ?.trim() + "...";

      return blogDetailMetadata(
        blog_id,
        blog_title,
        {
          title: `${blog.blog_title} | ASVAB Tutoring Blog`,
          description,
        },
        {
          title: blog.blog_title,
          description: blog.blog_content?.replace(/<[^>]*>/g, "").slice(0, 160),
          type: "article",
          publishedTime: blog.created_at,
          authors: [blog.written_by],
        },
      );
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return blogDetailMetadata(blog_id, blog_title, BLOG_DETAIL_FALLBACK_SEO);
}

export default async function Page({ params }: Props) {
  const { blog_id } = await params;

  if (!isKnownBlogId(blog_id)) {
    notFound();
  }

  const blog = await fetchBlogDetails(blog_id);

  if (!blog) {
    notFound();
  }

  return <BlogDetailClient blog={blog} />;
}
