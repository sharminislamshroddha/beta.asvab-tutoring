"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { studyRequest } from "@/lib/study-client";
import type { StudyAccount, StudyPlace } from "@/lib/study-types";
import styles from "../study.module.css";

type Profile = StudyAccount["profile"];
type Field =
  | "first_name"
  | "last_name"
  | "email"
  | "mobile"
  | "state_id"
  | "city_id"
  | "zip_code";

/** Edit profile: name, contact details and address (the fields the portal edits). */
export default function ProfileForm({
  profile,
  states,
  cities: initialCities,
}: {
  profile: Profile;
  states: StudyPlace[];
  cities: StudyPlace[];
}) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [values, setValues] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    mobile: profile.mobile,
    state_id: profile.state_id ? String(profile.state_id) : "",
    city_id: profile.city_id ? String(profile.city_id) : "",
    zip_code: profile.zip_code,
  });
  const [saved, setSaved] = useState(values);
  const [cities, setCities] = useState(initialCities);
  const [loadingCities, setLoadingCities] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = (Object.keys(values) as Field[]).some(
    (k) => values[k] !== saved[k],
  );

  const set = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setStatus(null);
  };

  const changeState = async (stateId: string) => {
    setValues((prev) => ({ ...prev, state_id: stateId, city_id: "" }));
    setErrors((prev) => ({ ...prev, state_id: undefined, city_id: undefined }));
    setStatus(null);
    setCities([]);
    if (!stateId) return;
    setLoadingCities(true);
    const result = await studyRequest("student-cities", { state_id: stateId });
    setLoadingCities(false);
    if (result.ok) {
      const list = (result.data.data as { cities?: StudyPlace[] } | undefined)
        ?.cities;
      setCities(Array.isArray(list) ? list : []);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const result = await studyRequest("student-profile-update", values);
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
    setSaved(values);
    setErrors({});
    setStatus({ type: "success", message: "Your profile has been updated." });
    // Header name / initials and server pages pick up the new details
    void refresh();
    router.refresh();
  };

  const field = (
    name: Field,
    label: string,
    input: React.ReactNode,
    hint?: string,
  ) => (
    <div className={styles.formField}>
      <label htmlFor={`profile-${name}`} className={styles.formLabel}>
        {label}
      </label>
      {input}
      {errors[name] ? (
        <span className={styles.formError} id={`profile-${name}-error`}>
          <i className="bi bi-exclamation-circle" aria-hidden="true" />{" "}
          {errors[name]}
        </span>
      ) : hint ? (
        <span className={styles.formHint}>{hint}</span>
      ) : null}
    </div>
  );

  const inputProps = (name: Field) => ({
    id: `profile-${name}`,
    name,
    className: `form-control ${styles.formInput} ${errors[name] ? "is-invalid" : ""}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `profile-${name}-error` : undefined,
  });

  return (
    <form
      className={`${styles.card} ${styles.accountCard}`}
      onSubmit={submit}
      noValidate
    >
      <section
        className={styles.formSection}
        aria-labelledby="profile-personal"
      >
        <h2 id="profile-personal" className={styles.formSectionTitle}>
          Personal details
        </h2>
        <div className={styles.formGrid}>
          {field(
            "first_name",
            "First name",
            <input
              {...inputProps("first_name")}
              value={values.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              autoComplete="given-name"
              maxLength={50}
              required
            />,
          )}
          {field(
            "last_name",
            "Last name",
            <input
              {...inputProps("last_name")}
              value={values.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              autoComplete="family-name"
              maxLength={50}
            />,
          )}
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="profile-contact">
        <h2 id="profile-contact" className={styles.formSectionTitle}>
          Contact
        </h2>
        <div className={styles.formGrid}>
          {field(
            "email",
            "Email",
            <input
              {...inputProps("email")}
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              required
            />,
            "You log in with this email.",
          )}
          {field(
            "mobile",
            "Mobile",
            <input
              {...inputProps("mobile")}
              type="tel"
              value={values.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              autoComplete="tel"
              maxLength={15}
              placeholder="(555) 555-5555"
            />,
          )}
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="profile-address">
        <h2 id="profile-address" className={styles.formSectionTitle}>
          Address
        </h2>
        <div className={styles.formGrid3}>
          {field(
            "state_id",
            "State",
            <select
              {...inputProps("state_id")}
              className={`form-select ${styles.formInput} ${errors.state_id ? "is-invalid" : ""}`}
              value={values.state_id}
              onChange={(e) => void changeState(e.target.value)}
              autoComplete="address-level1"
            >
              <option value="">Select a state</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>,
          )}
          {field(
            "city_id",
            "City",
            <select
              {...inputProps("city_id")}
              className={`form-select ${styles.formInput} ${errors.city_id ? "is-invalid" : ""}`}
              value={values.city_id}
              onChange={(e) => set("city_id", e.target.value)}
              disabled={!values.state_id || loadingCities}
              autoComplete="address-level2"
            >
              <option value="">
                {loadingCities
                  ? "Loading cities…"
                  : values.state_id
                    ? "Select a city"
                    : "Select a state first"}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>,
          )}
          {field(
            "zip_code",
            "ZIP code",
            <input
              {...inputProps("zip_code")}
              inputMode="numeric"
              value={values.zip_code}
              onChange={(e) =>
                set("zip_code", e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              autoComplete="postal-code"
              placeholder="12345"
            />,
          )}
        </div>
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
            type="button"
            className={styles.btnGhost}
            onClick={async () => {
              if (values.state_id !== saved.state_id)
                await changeState(saved.state_id);
              setValues(saved);
              setErrors({});
              setStatus(null);
            }}
            disabled={!dirty || saving}
          >
            Discard
          </button>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
