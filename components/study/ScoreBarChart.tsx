"use client";

import { useState } from "react";
import styles from "./study.module.css";

export type ScoreBarSeries = {
  key: string;
  label: string;
  color: string;
  /** Pass mark drawn across this series' columns */
  passLine?: number;
  /** Shown after values in the tooltip and table, e.g. "%" */
  unit?: string;
};

export type ScoreBarRow = {
  key: string;
  label: string;
  /** Short label under the column, e.g. "AR" (the full label is in the tooltip) */
  short?: string;
  series: string;
  /** 0-100 */
  value: number;
  /** Extra tooltip / table text, e.g. "4 lessons tested" */
  detail?: string;
};

const TICKS = [0, 25, 50, 75, 100];

/**
 * Column chart on a fixed 0-100 scale. Columns are grouped by series (each with
 * its own colour, group label and optional pass line), the value sits on each
 * column, and every column has a hover/focus tooltip plus a table view.
 */
export default function ScoreBarChart({
  title,
  subtitle,
  series,
  rows,
}: {
  title: string;
  subtitle?: string;
  series: ScoreBarSeries[];
  rows: ScoreBarRow[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const groups = series
    .map((s) => ({ series: s, rows: rows.filter((r) => r.series === s.key) }))
    .filter((g) => g.rows.length > 0);
  const passLines = groups.filter((g) => g.series.passLine !== undefined);
  const format = (value: number, s: ScoreBarSeries) =>
    `${value}${s.unit ?? ""}`;
  const columnCount = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartHead}>
        <span className={styles.chartTitle}>{title}</span>
        {subtitle && <span className={styles.chartSubtitle}>{subtitle}</span>}
      </figcaption>

      <ul className={styles.chartLegend} aria-label="Legend">
        {groups.length > 1 &&
          groups.map(({ series: s }) => (
            <li key={s.key}>
              <span
                className={styles.chartSwatch}
                style={{ background: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </li>
          ))}
        {passLines.map(({ series: s }) => (
          <li key={`pass-${s.key}`}>
            <span className={styles.chartPassSwatchH} aria-hidden="true" />
            Pass mark {s.passLine}
            {s.unit ?? ""}
          </li>
        ))}
      </ul>

      <div
        className={styles.colChart}
        style={{ ["--cols" as string]: columnCount }}
        onPointerLeave={() => setActive(null)}
      >
        <div className={styles.colAxis} aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} style={{ bottom: `${t}%` }}>
              {t}
            </span>
          ))}
        </div>

        <div className={styles.colPlot}>
          {TICKS.map((t) => (
            <span
              key={t}
              className={styles.colGrid}
              style={{ bottom: `${t}%` }}
              aria-hidden="true"
            />
          ))}

          <div className={styles.colGroups}>
            {groups.map(({ series: s, rows: groupRows }) => (
              <div
                key={s.key}
                className={styles.colGroup}
                style={{ ["--n" as string]: groupRows.length }}
              >
                {s.passLine !== undefined && (
                  <span
                    className={styles.colPass}
                    style={{ bottom: `${s.passLine}%` }}
                    aria-hidden="true"
                  />
                )}
                {groupRows.map((row) => {
                  const value = Math.max(0, Math.min(100, row.value));
                  return (
                    <div
                      key={row.key}
                      className={`${styles.colSlot} ${active === row.key ? styles.colSlotActive : ""}`}
                      tabIndex={0}
                      aria-label={`${s.label}, ${row.label}: ${format(row.value, s)}${
                        row.detail ? `, ${row.detail}` : ""
                      }`}
                      onPointerEnter={() => setActive(row.key)}
                      onFocus={() => setActive(row.key)}
                      onBlur={() => setActive(null)}
                    >
                      <span
                        className={styles.colBar}
                        style={{ height: `${value}%`, background: s.color }}
                        aria-hidden="true"
                      >
                        <span className={styles.colValue}>{row.value}</span>
                      </span>
                      {active === row.key && (
                        <span className={styles.colTooltip} role="tooltip">
                          <span className={styles.chartTooltipLine}>
                            <span
                              className={styles.chartSwatch}
                              style={{ background: s.color }}
                            />
                            <strong>{format(row.value, s)}</strong>
                          </span>
                          <span className={styles.colTooltipName}>
                            {row.label}
                          </span>
                          {row.detail && <em>{row.detail}</em>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div />
        <div className={styles.colLabels} aria-hidden="true">
          {groups.map(({ series: s, rows: groupRows }) => (
            <div
              key={s.key}
              className={styles.colGroup}
              style={{ ["--n" as string]: groupRows.length }}
            >
              <div className={styles.colLabelRow}>
                {groupRows.map((row) => (
                  <span
                    key={row.key}
                    className={styles.colLabel}
                    title={row.label}
                  >
                    {row.short || row.label}
                  </span>
                ))}
              </div>
              {groups.length > 1 && (
                <span className={styles.colGroupLabel}>{s.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <details className={styles.chartTable}>
        <summary>View as table</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Score</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap(({ series: s, rows: groupRows }) =>
              groupRows.map((row) => (
                <tr key={row.key}>
                  <td data-label="Name">{row.label}</td>
                  <td data-label="Score">{format(row.value, s)}</td>
                  <td data-label="Details">{row.detail ?? ""}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
