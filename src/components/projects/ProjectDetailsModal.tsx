'use client';

import { useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { ProjectDetails, RequirementCounts } from '@/types';

interface ProjectDetailsModalProps {
  open: boolean;
  project: ProjectDetails | null;
  countsLoading: boolean;
  detailsError?: string | null;
  onClose: () => void;
  onDownloadVision?: (project: ProjectDetails) => void;
  onDownloadRequirements?: (project: ProjectDetails) => void;
}

const emptyCounts: RequirementCounts = {
  functional: 0,
  non_functional: 0,
  conjectural: 0,
};

export default function ProjectDetailsModal({
  open,
  project,
  countsLoading,
  detailsError,
  onClose,
  onDownloadVision,
  onDownloadRequirements,
}: ProjectDetailsModalProps) {
  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const counts = project?.requirement_counts ?? emptyCounts;

  const handleDownloadVisionClick = () => {
    if (project) {
      onDownloadVision?.(project);
    }
  };

  const handleDownloadRequirementsClick = () => {
    if (project) {
      onDownloadRequirements?.(project);
    }
  };

  const tiles = [
    {
      label: 'Functional Requirements',
      value: counts.functional,
      accent: 'text-blue-700 dark:text-blue-200',
    },
    {
      label: 'Non-Functional Requirements',
      value: counts.non_functional,
      accent: 'text-amber-700 dark:text-amber-200',
    },
    {
      label: 'Conjectural Requirements',
      value: counts.conjectural,
      accent: 'text-purple-700 dark:text-purple-200',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark">
        <div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Project Overview</p>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {project?.title || 'Loading project...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close project details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {project ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Description</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {tiles.map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-900/40 p-4 shadow-sm"
                    >
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{tile.label}</p>
                      {countsLoading ? (
                        <div className="mt-3 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      ) : (
                        <p className={`mt-2 text-3xl font-bold ${tile.accent}`}>{tile.value}</p>
                      )}
                    </div>
                  ))}
                </div>
                {detailsError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 p-3 text-xs text-red-600 dark:text-red-300">
                    {detailsError}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Vision Document</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{project.vision_document_name || 'No file uploaded'}</p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    onClick={handleDownloadVisionClick}
                    disabled={!project.vision_document_name}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Requirements Document</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{project.requirements_document_name || 'No file uploaded'}</p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    onClick={handleDownloadRequirementsClick}
                    disabled={!project.requirements_document_name}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-gray-500 dark:text-gray-400">
              Select a project to view its details.
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border-light dark:border-border-dark px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
