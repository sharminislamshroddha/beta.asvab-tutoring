"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TutorRequestSuccessModal from "../tutor-request-success-modal/TutorRequestSuccessModal";
import { postPhpBrowser } from "@/lib/php-browser";
import type { StateOption } from "@/lib/php-api";

type StatusType = "success" | "error" | "info";

type Props = {
  initialStates?: StateOption[];
};

export default function TutorRequestForm({ initialStates = [] }: Props) {
  const [states] = useState<StateOption[]>(initialStates);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    state_id: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [status, setStatus] = useState<{
    type: StatusType;
    text: string;
  } | null>(
    initialStates.length === 0
      ? {
          type: "error",
          text: "Unable to load state list right now. Please refresh and try again.",
        }
      : null,
  );

  const [fieldErrors, setFieldErrors] = useState({
    phone: "",
    email: "",
  });

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return "Phone number is required.";
    if (digits.length !== 10) return "Enter a valid 10-digit US number.";
    if (/^(\d)\1{9}$/.test(digits)) return "Enter a valid US number.";
    if (digits[0] === "0" || digits[0] === "1")
      return "Area code cannot start with 0 or 1.";
    if (digits[3] === "0" || digits[3] === "1")
      return "Exchange code cannot start with 0 or 1.";
    return "";
  };

  const validateEmail = (email: string) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!email) return "Email is required.";
    if (!re.test(String(email).toLowerCase()))
      return "Please enter a valid email address.";
    return "";
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length > 10) {
        setFieldErrors((prev) => ({
          ...prev,
          phone: "Only 10 digits are allowed for US numbers.",
        }));
        setTimeout(() => {
          setFieldErrors((prev) => ({
            ...prev,
            phone: validatePhone(form.phone),
          }));
        }, 2000);
        return;
      }
      setForm((prev) => ({ ...prev, [name]: cleaned }));

      if (cleaned.length > 0 && cleaned.length < 10) {
        const err = validatePhone(cleaned);
        setFieldErrors((prev) => ({ ...prev, phone: err }));
      } else {
        setFieldErrors((prev) => ({ ...prev, phone: validatePhone(cleaned) }));
      }
    } else if (name === "email") {
      setForm((prev) => ({ ...prev, [name]: value }));
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (status?.type === "error") setStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const phoneErr = validatePhone(form.phone);
    const emailErr = validateEmail(form.email);

    if (phoneErr || emailErr) {
      setFieldErrors({ phone: phoneErr, email: emailErr });
      setStatus({
        type: "error",
        text: "Please fix all the errors in the form before submitting.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const data = (await postPhpBrowser({
        action: "tutor-request",
        name: form.name,
        email: form.email,
        phone: form.phone,
        state_id: form.state_id,
        message: form.message,
      })) as { isSuccess?: boolean; message?: string };

      if (data?.isSuccess) {
        setShowSuccessModal(true);
        setForm({ name: "", email: "", phone: "", state_id: "", message: "" });
      } else {
        setStatus({
          type: "error",
          text: data?.message || "Submission failed. Please try again.",
        });
        console.error("tutor-request failed payload:", data);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setStatus({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusClass =
    status?.type === "success"
      ? "alert alert-success"
      : status?.type === "error"
        ? "alert alert-danger"
        : "alert alert-info";

  return (
    <>
      <div className="bg-custom-dark p-4 rounded shadow text-white">
        <h2 className="text-center mb-4">REQUEST A TUTOR NOW!</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              placeholder="Enter a valid email address"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email && (
              <div className="invalid-feedback">{fieldErrors.email}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">Phone (US Only)</label>
            <input
              type="tel"
              className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
              placeholder="Enter a valid phone number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />
            {fieldErrors.phone && (
              <div className="invalid-feedback">{fieldErrors.phone}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">State</label>
            <select
              className="form-select"
              name="state_id"
              value={form.state_id}
              onChange={handleChange}
              required
              disabled={submitting}
            >
              <option value="">—Please choose an option—</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Message</label>
            <textarea
              className="form-control"
              rows={4}
              name="message"
              value={form.message}
              onChange={handleChange}
              disabled={submitting}
              placeholder="Write us a message..."
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary-custom w-50 d-block mx-auto mt-4"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>

          {status && (
            <div className={`${statusClass} mt-3 mb-0`} role="alert">
              {status.text}
            </div>
          )}
        </form>

        <div className="d-flex justify-content-center gap-2 mt-4">
          <Link href="/our-mobile-apps" className="app-link-btn">
            <Image
              src="/images/download-on-the-app-store.svg"
              alt="App Store"
              width={120}
              height={40}
              unoptimized
              style={{ width: "auto", height: "40px" }}
            />
          </Link>
          <Link href="/our-mobile-apps" className="app-link-btn">
            <Image
              src="/images/Google_Play_Store_badge_EN.svg"
              alt="Google Play"
              width={135}
              height={40}
              unoptimized
              style={{ width: "auto", height: "40px" }}
            />
          </Link>
        </div>
      </div>

      <TutorRequestSuccessModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </>
  );
}
