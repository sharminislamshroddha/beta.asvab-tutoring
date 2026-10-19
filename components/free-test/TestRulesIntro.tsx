import styles from "./freeTest.module.css";

type TestRulesIntroProps = {
  variant: "practice" | "prediction";
  courseName?: string;
};

const PRACTICE_STEPS = [
  "Choose a section from the tabs below. Each one matches a subject area for this course.",
  "Answer every question at your own pace. You can switch sections at any time.",
  "Submit when you finish a section to see your score and a question-by-question review.",
  "Use your section breakdown to see where you scored well and where to focus your study time.",
] as const;

const PREDICTION_STEPS = [
  "Work through each section below. Every section matches a subject area for this course.",
  "Answer every question in every section before submitting.",
  "Submit the full test only when all sections are complete to receive your predicted score.",
  "Review your predicted exam score and section-by-section breakdown to focus your study time.",
] as const;

export default function TestRulesIntro({
  variant,
  courseName,
}: TestRulesIntroProps) {
  const name = courseName?.trim() || "Course";
  const isPractice = variant === "practice";

  const title = isPractice
    ? `How to take the ${name} Practice Test`
    : `How to take the ${name} Prediction Test`;

  const lead = isPractice
    ? `This ${name} free practice test uses real-style questions so you can gauge how prepared you are before test day.`
    : `This ${name} free prediction test uses real-style questions to help you estimate your exam score before test day.`;

  const steps = isPractice ? PRACTICE_STEPS : PREDICTION_STEPS;

  return (
    <div className={styles.testRulesCard}>
      <div className={styles.testRulesHeader}>
        <span className={styles.testRulesIconWrap} aria-hidden>
          <i className="bi bi-info-circle-fill" aria-hidden />
        </span>
        <h2 className={styles.testRulesTitle}>{title}</h2>
      </div>
      <p className={styles.testRulesLead}>{lead}</p>
      <ul className={styles.testRulesList}>
        {steps.map((step) => (
          <li key={step}>
            <i className="bi bi-check-circle-fill" aria-hidden />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
