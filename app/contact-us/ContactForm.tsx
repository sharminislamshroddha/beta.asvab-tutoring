"use client";

import React, { useState } from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { postPhpBrowser } from "@/lib/php-browser";
import type { StateOption } from "@/lib/php-api";

type Props = {
  initialStates?: StateOption[];
};

export default function ContactForm({ initialStates = [] }: Props) {
  const [states] = useState<StateOption[]>(initialStates);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    state_id: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = (await postPhpBrowser({
        action: "contact-us",
        name: form.name,
        email: form.email,
        phone: form.phone,
        state_id: form.state_id,
        message: form.message,
      })) as { isSuccess?: boolean; message?: string };

      if (data?.isSuccess) {
        alert(
          data.message ||
            "We have received your information. We will contact you soon.",
        );
        setForm({ name: "", email: "", phone: "", state_id: "", message: "" });
      } else {
        alert(data?.message || "Failed! Please try again later.");
        console.error("Submit failed response:", data);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white min-vh-100">
      {/* ✅ Banner */}
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl font-bold">Contact Us</h1>
        <Breadcrumb
          segments={["contact-us"]}
          className="text-white text-base mt-1"
        />
      </div>

      {/* ✅ Contact Section */}
      <div className="container py-5">
        <div className="row g-5 justify-content-center align-items-start">
          {/* Left Side */}
          <div className="col-lg-4">
            <div className="p-4 bg-light rounded shadow-sm">
              <h3 className="fw-bold mb-3 text-primary">Get in Touch</h3>

              <p className="mb-2">
                <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                United States
              </p>

              <p className="mb-2">
                <i className="bi bi-envelope-fill text-primary me-2"></i>
                <a
                  href="mailto:info@asvab-tutoring.com"
                  className="text-dark text-decoration-none"
                >
                  info@asvab-tutoring.com
                </a>
              </p>

              <p className="mb-0">
                <i className="bi bi-telephone-fill text-primary me-2"></i>
                <a
                  href="tel:+17182006396"
                  className="text-dark text-decoration-none"
                >
                  (718)-200-6396
                </a>
              </p>

              <p className="mt-3">
                Fill out the form and our team will get back to you shortly.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="col-lg-6">
            <div className="bg-light p-4 rounded shadow-sm w-100">
              <h2 className="fw-bold mb-4 text-center">Contact With Us</h2>

              <form onSubmit={handleSubmit} className="d-block w-100">
                <div className="mb-3 w-100">
                  <label className="form-label d-block">Name</label>
                  <input
                    type="text"
                    className="form-control w-100"
                    placeholder="Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3 w-100">
                  <label className="form-label d-block">
                    Email (Use your valid email address)
                  </label>
                  <input
                    type="email"
                    className="form-control w-100"
                    placeholder="Email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3 w-100">
                  <label className="form-label d-block">Phone (US Only)</label>
                  <input
                    type="tel"
                    className="form-control w-100"
                    placeholder="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3 w-100">
                  <label className="form-label d-block">State</label>
                  <select
                    className="form-select w-100"
                    name="state_id"
                    value={form.state_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">—Please choose an option—</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3 w-100">
                  <label className="form-label d-block">Message</label>
                  <textarea
                    className="form-control w-100"
                    rows={4}
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                  />
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    className="btn btn-primary-custom mt-4 px-5 py-2"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
