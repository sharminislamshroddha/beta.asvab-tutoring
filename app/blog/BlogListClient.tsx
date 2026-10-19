"use client";

import { useEffect, useState } from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import Link from "next/link";
import { stripHtmlToText } from "@/lib/decode-html";
import { slugify } from "@/lib/slugify";
import type { BlogPost } from "@/lib/php-api";

type Props = {
  initialBlogs: BlogPost[];
  initialTotalPages: number;
  initialPage?: number;
};

function makeExcerpt(html: string, max = 120): string {
  const text = stripHtmlToText(html);
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "...";
}

export default function BlogListClient({
  initialBlogs,
  initialTotalPages,
  initialPage = 1,
}: Props) {
  const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

  useEffect(() => {
    if (page === initialPage) {
      setBlogs(initialBlogs);
      setTotalPages(initialTotalPages);
      return;
    }

    async function fetchBlogs() {
      setLoading(true);
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "get-blogs",
            page_no: page.toString(),
          }),
        });

        const raw = await res.text();
        let data: {
          isSuccess?: boolean;
          data?: BlogPost[];
          total_pages?: number | string;
        };
        try {
          data = JSON.parse(raw);
        } catch {
          console.error("get-blogs returned non-JSON:", raw);
          setBlogs([]);
          setTotalPages(1);
          return;
        }

        if (data?.isSuccess) {
          setBlogs(Array.isArray(data.data) ? data.data : []);
          setTotalPages(Number(data.total_pages) || 1);
        } else {
          setBlogs([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("Error fetching blogs:", error);
        setBlogs([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    fetchBlogs();
  }, [page, initialPage, initialBlogs, initialTotalPages]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range: (number | string)[] = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  return (
    <section>
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded-bottom flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl font-bold">Blog</h1>
        <Breadcrumb segments={["blog"]} className="text-white text-base mt-1" />
      </div>

      <div className="container">
        <div className="row g-4">
          {loading ? (
            <div className="text-center py-5">Loading blogs...</div>
          ) : blogs.length > 0 ? (
            blogs.map((blog) => (
              <div key={blog.blog_id} className="col-md-6 col-lg-4">
                <Link
                  href={`/blog-detail/${blog.blog_id}/${slugify(blog.blog_title)}`}
                >
                  <div className="card hover-lift shadow cursor-pointer h-100 border-0">
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title mb-2 py-4 px-4">
                        {blog.blog_title}
                      </h5>

                      <div className="d-flex justify-content-between align-items-center mb-3 px-4">
                        <div className="d-flex align-items-center">
                          <img
                            src={
                              blog.writer_img &&
                              !blog.writer_img.includes("image.php?src")
                                ? blog.writer_img
                                : "/images/author_blog.png"
                            }
                            className="rounded-circle me-2"
                            width="30"
                            height="30"
                            alt={blog.written_by || "Author"}
                          />
                          <small>{blog.written_by || "Unknown Author"}</small>
                        </div>

                        <small className="text-end">
                          {new Date(blog.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </small>
                      </div>

                      <p className="card-text px-4">
                        {makeExcerpt(blog.blog_content, 120)}
                      </p>

                      <div className="text-center mt-auto">
                        <div className="btn btn-primary-custom my-3 px-3 py-2 text-nowrap">
                          Continue Reading
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="text-center py-5">No blogs found.</div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <nav className="mt-5">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  &laquo; Prev
                </button>
              </li>

              {getPaginationRange().map((p, index) =>
                typeof p === "number" ? (
                  <li key={index} className="page-item">
                    <button
                      className={`page-link ${
                        p === page ? "bg-custom-primary text-white" : ""
                      }`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  </li>
                ) : (
                  <li key={index} className="page-item disabled">
                    <span className="page-link">…</span>
                  </li>
                ),
              )}

              <li
                className={`page-item ${page === totalPages ? "disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next &raquo;
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
