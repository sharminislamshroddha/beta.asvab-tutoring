"use client";

import React, { useState } from "react";

interface TutorRequestSuccessModalProps {
  show: boolean;
  onClose: () => void;
}

export default function TutorRequestSuccessModal({
  show,
  onClose,
}: TutorRequestSuccessModalProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  if (!show) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("somdtutoring@gmail.com");
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1400);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  return (
    <div
      className="modal fade show"
      style={{
        display: "block",
        backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 1050,
        backdropFilter: "blur(4px)",
      }}
      tabIndex={-1}
      role="dialog"
    >
      <div
        className="modal-dialog modal-dialog-centered"
        role="document"
        style={{ maxWidth: "550px" }}
      >
        <div
          className="modal-content border-0 shadow-lg"
          style={{
            borderRadius: "20px",
            overflow: "hidden",
            background: "#ffffff",
          }}
        >
          {/* Header with Background */}
          <div
            className="p-3 text-center position-relative"
            style={{
              backgroundColor: "#002341",
              color: "#ffffff",
            }}
          >
            <div
              className="position-absolute"
              style={{ top: "12px", right: "15px", cursor: "pointer" }}
              onClick={onClose}
            >
              <i
                className="bi bi-x-lg text-white"
                style={{ fontSize: "1.1rem" }}
              ></i>
            </div>
            <div
              className="bg-white d-inline-flex align-items-center justify-content-center rounded-circle mb-2 shadow-sm"
              style={{ width: "50px", height: "50px" }}
            >
              <i
                className="bi bi-check-circle-fill"
                style={{ fontSize: "1.8rem", color: "#f2a155" }}
              ></i>
            </div>
            <h5 className="fw-bold mb-0">Tutoring Request Received!</h5>
          </div>

          <div className="modal-body p-3 p-md-4">
            <p
              className="text-center mb-3 text-muted"
              style={{ fontSize: "0.95rem", lineHeight: "1.5" }}
            >
              Thanks for your request.{" "}
              <span className="fw-bold text-dark">
                Someone will contact you soon.
              </span>
            </p>

            <div
              className="rounded-4 p-3"
              style={{
                backgroundColor: "#fff9f2",
                border: "1px dashed #f2a155",
              }}
            >
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                What’s Next? <span style={{ fontSize: "1.2rem" }}>🚀</span>
              </h6>
              <p className="fw-semibold mb-2 small" style={{ color: "#555" }}>
                Get your FREE evaluation in 3 easy steps:
              </p>

              <div className="d-flex flex-column gap-2">
                <div className="d-flex gap-2 align-items-start">
                  <span className="fs-6">1️⃣</span>
                  <div>
                    <p className="mb-0 fw-bold small">
                      Download Microsoft Teams
                    </p>
                    <div className="d-flex gap-2">
                      <a
                        href="https://apps.apple.com/us/app/microsoft-teams/id1113153706"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none x-small fw-bold"
                        style={{ color: "#f2a155", fontSize: "0.75rem" }}
                      >
                        App Store{" "}
                        <i className="bi bi-box-arrow-up-right px-1"></i>
                      </a>
                      <span className="text-muted small">|</span>
                      <a
                        href="https://play.google.com/store/apps/details?id=com.microsoft.teams"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none x-small fw-bold"
                        style={{ color: "#f2a155", fontSize: "0.75rem" }}
                      >
                        Google Play{" "}
                        <i className="bi bi-box-arrow-up-right px-1"></i>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 align-items-center">
                  <span className="fs-6">2️⃣</span>
                  <p className="mb-0 fw-bold small">Create your account</p>
                </div>

                <div className="d-flex gap-2 align-items-start">
                  <span className="fs-6">3️⃣</span>
                  <div>
                    <p className="mb-0 fw-bold small">Message us on Teams:</p>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <code
                        className="bg-white border rounded px-2 py-0"
                        style={{ color: "#002341", fontSize: "0.85rem" }}
                      >
                        somdtutoring@gmail.com
                      </code>
                      <button
                        className="btn btn-sm p-0 border-0"
                        onClick={handleCopyEmail}
                        title="Copy Email"
                      >
                        <i
                          className={`bi ${emailCopied ? "bi-check-lg text-success" : "bi-copy text-muted"}`}
                          style={{ fontSize: "0.9rem" }}
                        ></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                📩 Check your <span className="fw-bold">inbox</span> for details
              </p>
              <p
                className="mb-0 text-muted x-small"
                style={{ fontSize: "0.75rem" }}
              >
                ⚠️ If you don’t see the email, please check your{" "}
                <span className="fw-bold">spam/junk folder</span>
              </p>
            </div>
          </div>

          <div className="modal-footer border-0 p-3 pt-0 justify-content-center">
            <button
              onClick={onClose}
              className="btn btn-primary-custom w-100 py-2 fw-bold"
              style={{ borderRadius: "10px", fontSize: "1rem" }}
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
