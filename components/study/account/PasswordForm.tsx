"use client";

import { useState, type FormEvent } from "react";
import { studyRequest } from "@/lib/study-client";
import styles from "../study.module.css";

type Field = "old_password" | "new_password" | "conf_password";

const MIN_LENGTH = 6;

/** Change password: current password, new password twice (as the portal checks). */
export default function PasswordForm() {
  const empty = { old_password: "", new_password: "", conf_password: "" };
  const [values, setValues] = useState(empty);
  const [show, setShow] = useState<Record<Field, boolean>>({
    old_password: false,
    new_password: false,
    conf_password: false,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setStatus(null);
  };

  const longEnough = values.new_password.length >= MIN_LENGTH;
  const matches =
    values.new_password !== "" && values.new_password === values.conf_password;
  const differs =
    values.new_password !== "" && values.new_password !== values.old_password;
  const ready = values.old_password !== "" && longEnough && matches && differs;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setStatus(null);
    const result = await studyRequest("student-password-change", values);
    setSaving(false);
    if (!result.ok) {
      setStatus({ type: "error", message: result.message });
      return;
    }
    if (result.data.isSuccess === false) {
      setErrors((result.data.errors as typeof errors) ?? {});
      setStatus({
        type: "error",
        message: String(
          result.data.message || "Please check the highlighted fields.",
        ),
      });
      return;
    }
    setValues(empty);
    setErrors({});
    setStatus({
      type: "success",
      message:
        "Your password has been changed. We've emailed you a confirmation.",
    });
  };

  const passwordField = (name: Field, label: string, autoComplete: string) => (
    <div className={styles.formField}>
      <label htmlFor={`password-${name}`} className={styles.formLabel}>
        {label}
      </label>
      <div className={styles.passwordWrap}>
        <input
          id={`password-${name}`}
          name={name}
          type={show[name] ? "text" : "password"}
          className={`form-control ${styles.formInput} ${errors[name] ? "is-invalid" : ""}`}
          value={values[name]}
          onChange={(e) => set(name, e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `password-${name}-error` : undefined}
          required
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShow((prev) => ({ ...prev, [name]: !prev[name] }))}
          aria-label={
            show[name]
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={show[name]}
        >
          <i
            className={`bi ${show[name] ? "bi-eye-slash" : "bi-eye"}`}
            aria-hidden="true"
          />
        </button>
      </div>
      {errors[name] && (
        <span className={styles.formError} id={`password-${name}-error`}>
          <i className="bi bi-exclamation-circle" aria-hidden="true" />{" "}
          {errors[name]}
        </span>
      )}
    </div>
  );

  const check = (ok: boolean, text: string) => (
    <li className={ok ? styles.checkOk : undefined}>
      <i
        className={`bi ${ok ? "bi-check-circle-fill" : "bi-circle"}`}
        aria-hidden="true"
      />{" "}
      {text}
    </li>
  );

  return (
    <form
      className={`${styles.card} ${styles.accountCard}`}
      onSubmit={submit}
      noValidate
    >
      <section className={styles.formSection} aria-labelledby="password-title">
        <h2 id="password-title" className={styles.formSectionTitle}>
          Change your password
        </h2>
        <p className={styles.formIntro}>
          For your security, enter your current password first. You&apos;ll use
          the new password the next time you log in.
        </p>
        <div className={styles.formStack}>
          {passwordField(
            "old_password",
            "Current password",
            "current-password",
          )}
          {passwordField("new_password", "New password", "new-password")}
          {passwordField(
            "conf_password",
            "Confirm new password",
            "new-password",
          )}
        </div>
        <ul className={styles.checkList} aria-label="Password requirements">
          {check(longEnough, `At least ${MIN_LENGTH} characters`)}
          {check(differs, "Different from your current password")}
          {check(matches, "Both new passwords match")}
        </ul>
      </section>

      <div className={styles.formFooter}>
        <div className={styles.formStatus} role="status" aria-live="polite">
          {status && (
            <span
              className={
                status.type === "success"
                  ? styles.formSuccess
                  : styles.formError
              }
            >
              <i
                className={`bi ${status.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle"}`}
                aria-hidden="true"
              />{" "}
              {status.message}
            </span>
          )}
        </div>
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={!ready || saving}
          >
            {saving ? "Changing…" : "Change password"}
          </button>
        </div>
      </div>
    </form>
  );
}
