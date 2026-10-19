"use client";

import React from "react";
import styles from "./freePredTest.module.css";

type Props = {
  show: boolean;
  incompleteCategories: string[];
  onClose: () => void;
  onGoToCategory: (categoryIndex: number) => void;
  categoryIndices: number[];
};

export default function IncompleteCategoriesModal({
  show,
  incompleteCategories,
  onClose,
  onGoToCategory,
  categoryIndices,
}: Props) {
  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="incomplete-categories-title"
      >
        <div className={`modal-dialog modal-dialog-centered ${styles.incompleteModal}`}>
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div
              className="modal-header border-0 text-white px-4 py-3"
              style={{ backgroundColor: "#002341" }}
            >
              <h5 className="modal-title fw-bold" id="incomplete-categories-title">
                <i className="bi bi-exclamation-circle me-2" aria-hidden />
                Complete All Sections
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={onClose}
              />
            </div>
            <div className="modal-body px-4 py-4">
              <p className="text-secondary mb-3">
                Please finish all sections before submitting to view your prediction
                result. The following sections still need answers:
              </p>
              <ul className="list-group list-group-flush mb-0">
                {incompleteCategories.map((name, idx) => (
                  <li
                    key={name}
                    className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 py-2"
                  >
                    <span className="fw-semibold text-dark">{name}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        onGoToCategory(categoryIndices[idx]);
                        onClose();
                      }}
                    >
                      Go to section
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer border-0 px-4 pb-4 pt-0">
              <button
                type="button"
                className="btn btn-primary-custom px-4"
                onClick={onClose}
              >
                Continue Testing
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} aria-hidden />
    </>
  );
}
