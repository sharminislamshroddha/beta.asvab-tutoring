"use client";

import type { NoticeItem } from "@/lib/php-api";

export type NoticeType = NoticeItem["notice_type"];
export type Notice = NoticeItem;

interface NoticeContentProps {
  initialNotices?: NoticeItem[];
  maxNotices?: number;
  showPinnedFirst?: boolean;
  filterType?: NoticeType | "all";
}

const getNoticeTypeStyles = (
  type: NoticeType,
): { bg: string; text: string; label: string } => {
  switch (type) {
    case "important":
      return { bg: "bg-danger", text: "text-white", label: "Important" };
    case "announcement":
      return {
        bg: "bg-custom-primary",
        text: "text-white",
        label: "Announcement",
      };
    case "update":
      return { bg: "bg-info", text: "text-white", label: "Update" };
    case "reminder":
      return { bg: "bg-warning", text: "text-dark", label: "Reminder" };
    default:
      return { bg: "bg-secondary", text: "text-white", label: "Notice" };
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

const NoticeCard: React.FC<{ notice: Notice }> = ({ notice }) => {
  const typeStyles = getNoticeTypeStyles(notice.notice_type);

  return (
    <div
      className={`notice-card border rounded-3 p-3 mb-3 shadow-sm ${
        notice.is_pinned ? "border-warning border-2" : "border-2"
      }`}
      style={{
        backgroundColor: "#ffffff",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {notice.is_pinned && (
        <div className="d-flex align-items-center gap-1 mb-2">
          <i className="bi bi-pin-angle-fill text-warning"></i>
          <span className="badge bg-warning text-dark">Pinned</span>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
        <h5
          className="fw-bold text-dark mb-0"
          style={{ flex: 1, minWidth: "200px" }}
        >
          {notice.title}
        </h5>
        <span
          className={`badge ${typeStyles.bg} ${typeStyles.text} flex-shrink-0`}
        >
          {typeStyles.label}
        </span>
      </div>

      <div
        className="notice-description text-secondary small mb-3"
        dangerouslySetInnerHTML={{ __html: notice.description || "" }}
      />

      <div className="d-flex align-items-center text-muted small">
        <i className="bi bi-calendar3 me-1"></i>
        <span>{formatDate(notice.created_at)}</span>
      </div>
    </div>
  );
};

export default function NoticeContent({
  initialNotices = [],
  maxNotices = 10,
  showPinnedFirst = true,
  filterType = "all",
}: NoticeContentProps) {
  const processedNotices = (() => {
    let result = [...initialNotices];

    if (filterType !== "all") {
      result = result.filter((notice) => notice.notice_type === filterType);
    }

    if (showPinnedFirst) {
      result.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }

    return result.slice(0, maxNotices);
  })();

  if (processedNotices.length === 0) {
    return null;
  }

  return (
    <section
      id="notices"
      className="py-5 px-3"
      style={{ backgroundColor: "#002341" }}
    >
      <div className="container">
        <div className="text-center mb-4 position-relative">
          <h2
            className="fw-bold display-6 d-inline-block pb-3 position-relative text-white"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
          >
            Notices & Announcements
            <img
              src="/images/border_v1.png"
              alt="underline"
              width={160}
              height={8}
              className="position-absolute start-50 translate-middle-x bottom-0"
              style={{ height: "8px", width: "160px", objectFit: "cover" }}
            />
          </h2>
        </div>

        <div className="card border-0 rounded-4 shadow-lg overflow-hidden">
          <div className="card-body p-4 p-md-5">
            <div className="notices-list">
              {processedNotices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notice-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        .notice-description :global(a) {
          color: #f2a155;
          text-decoration: underline;
        }

        .notice-description :global(a:hover) {
          color: #e58a34;
        }
      `}</style>
    </section>
  );
}
