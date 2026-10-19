"use client";

import React, { useState } from "react";

export default function NextStepCard({
  service,
  className,
}: {
  service: string;
  className?: string;
}) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("somdtutoring@gmail.com");
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1400);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  if (!service) return null;

  return (
    <div
      className={`rounded-3 p-4 mt-4 text-start ${className}`}
      style={{
        backgroundColor: "#fff9e7",
        borderLeft: "4px solid #f2a155",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "10px",
          }}
        >
          <i
            className="bi bi-info-square-fill"
            style={{
              fontSize: 24,
              color: "#f2a155",
              flexShrink: 0,
            }}
          />
          <h5 className="fw-bold" style={{ marginTop: 5, color: "#f2a155" }}>
            Next Step After Payment
          </h5>
        </div>
        <div className="text-muted">
          <p
            className="fw-semibold mb-3"
            style={{
              color: "#333333d7",
              fontSize: "15px",
              lineHeight: "1.5",
            }}
          >
            Follow the steps to start {service}:
          </p>
          <ol style={{ paddingLeft: "20px", margin: 0 }}>
            <li
              className="mb-2"
              style={{
                color: "#555",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Download the Microsoft Teams app from{" "}
              <a
                href="https://apps.apple.com/us/app/microsoft-teams/id1113153706"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#f2a155",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                className="text-decoration-underline"
              >
                App Store{" "}
                <i
                  className="bi bi-box-arrow-up-right"
                  style={{
                    fontSize: "12px",
                    marginLeft: "2px",
                  }}
                />
              </a>{" "}
              or{" "}
              <a
                href="https://play.google.com/store/apps/details?id=com.microsoft.teams"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#f2a155",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                className="text-decoration-underline"
              >
                Google Play{" "}
                <i
                  className="bi bi-box-arrow-up-right"
                  style={{
                    fontSize: "12px",
                    marginLeft: "2px",
                  }}
                />{" "}
              </a>
            </li>
            <li
              className="mb-2"
              style={{
                color: "#555",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Create a Teams account
            </li>
            <li
              style={{
                color: "#555",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexWrap: "wrap",
                }}
              >
                <span>Send a text message on teams to:</span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "#f2a155",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  <span>somdtutoring@gmail.com</span>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "2px 6px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffe7c1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    title="Copy email address"
                  >
                    <i
                      className={`bi ${emailCopied ? "bi-check-lg" : "bi-copy"}`}
                      style={{
                        fontSize: "14px",
                        color: "#f2a155",
                        transition:
                          "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
                        display: "inline-block",
                        transform: emailCopied ? "scale(1.2)" : "scale(1)",
                        opacity: 1,
                      }}
                    />
                  </button>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
