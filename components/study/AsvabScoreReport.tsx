import type { AsvabScoreReport as AsvabScoreReportData } from "@/lib/study-types";
import styles from "./asvabScoreReport.module.css";

/** Full ASVAB prediction test result in the official "ASVAB SCORE REPORT" layout. */
export default function AsvabScoreReport({ report }: { report: AsvabScoreReportData }) {
  return (
    <section className={styles.report} aria-labelledby="asvab-report-title">
      <h2 id="asvab-report-title" className={styles.title}>
        ASVAB SCORE REPORT
      </h2>

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>Testing Session Date:</dt>
          <dd>{report.sessionDate}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Applicant Name:</dt>
          <dd>{report.applicantName}</dd>
        </div>
      </dl>

      <hr className={styles.rule} />

      <div className={styles.standard}>
        <div className={styles.standardLabel} id="asvab-standard-label">
          Standard Scores:
        </div>
        <div className={styles.standardScroll}>
          <table className={styles.standardTable} aria-labelledby="asvab-standard-label">
            <thead>
              <tr>
                {report.standardScores.map((s) => (
                  <th key={s.code} scope="col">
                    {s.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {report.standardScores.map((s) => (
                  <td key={s.code}>{s.score}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <hr className={styles.rule} />

      <h3 className={styles.compositeTitle} id="asvab-composite-label">
        Composite Scores:
      </h3>
      <table className={styles.compositeTable} aria-labelledby="asvab-composite-label">
        <tbody>
          {report.composites.map((c) => (
            <tr key={c.branch}>
              <th scope="row">{c.branch}</th>
              <td>
                <div className={styles.compositeCode}>GT</div>
                <div>{c.score}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.afqt}>
        <strong>AFQT Percentile Score:</strong>
        <strong className={styles.afqtValue}>{report.afqt ?? "–"}</strong>
      </p>
    </section>
  );
}
