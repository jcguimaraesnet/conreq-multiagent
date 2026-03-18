'use client';

import { useEffect } from 'react';
import { X, FileText, Tag, Calendar, User } from 'lucide-react';
import { Requirement, RequirementType, NFRCategory } from '@/types';
import Badge from '@/components/ui/Badge';

interface RequirementDetailsModalProps {
  open: boolean;
  requirement: Requirement | null;
  onClose: () => void;
}

// Helper to format NFR category for display
function formatNFRCategory(category: NFRCategory | null): string {
  if (!category) return 'N/A';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Helper to format date for display
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RequirementDetailsModal({
  open,
  requirement,
  onClose,
}: RequirementDetailsModalProps) {
  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !requirement) return null;

  const isNonFunctional = requirement.type === RequirementType.NonFunctional;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Requirement Details</p>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-1 font-mono">
                {requirement.requirement_id}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close requirement details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Type Badge */}
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Type:</span>
              <Badge type={requirement.type} />
            </div>

            {/* Category (only for Non-Functional) */}
            {isNonFunctional && requirement.category && (
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Category:</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  {formatNFRCategory(requirement.category)}
                </span>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Description
              </h3>
              <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {requirement.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Author */}
              <div className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Author
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {requirement.author || 'Unknown'}
                </p>
              </div>

              {/* Created At */}
              <div className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Created
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(requirement.created_at)}
                </p>
              </div>
            </div>

            {/* Updated At */}
            {requirement.updated_at && requirement.updated_at !== requirement.created_at && (
              <div className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Last Updated
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(requirement.updated_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
