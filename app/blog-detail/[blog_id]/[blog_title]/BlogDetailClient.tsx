"use client";

import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { decodeHtmlEntitiesDeep } from "@/lib/decode-html";
import type { BlogPost } from "@/lib/php-api";

type Props = {
  blog: BlogPost | null;
};

export default function BlogDetailClient({ blog }: Props) {
  if (!blog) {
    return (
      <div className="container py-5 text-center">
        <h4>Blog not found</h4>
      </div>
    );
  }

  return (
    <section className="bg-light">
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center">
        <h1 className="text-white mb-2 text-3xl font-bold">{blog.blog_title}</h1>
        <Breadcrumb
          segments={["blog", "blog-detail"]}
          className="text-white text-base mt-1"
        />
      </div>

      <div className="container py-4">
        <div className="card shadow-sm border-0 p-4">
          <div className="d-flex align-items-center mb-4">
            <img
              src={
                blog.writer_img?.startsWith("http")
                  ? blog.writer_img
                  : `${process.env.NEXT_PUBLIC_RESOURCES_URL}/practice-test/${blog.writer_img}`
              }
              alt={blog.written_by}
              width={40}
              height={40}
              className="rounded-circle me-2"
            />
            <div>
              <h6 className="mb-0 text-capitalize">{blog.written_by}</h6>
              <small>
                {new Date(blog.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </small>
            </div>
          </div>

          <div
            className="lh-lg blog-content"
            dangerouslySetInnerHTML={{
              __html: decodeHtmlEntitiesDeep(blog.blog_content || ""),
            }}
          />
        </div>
      </div>
    </section>
  );
}
