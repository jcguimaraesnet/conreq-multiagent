"use client";

import { useState } from 'react';

interface InterruptFormPositiveImpactDescriptionProps {
  inputCount: number;
  onSubmit: (responses: string) => void;
}

export default function InterruptFormPositiveImpactDescription({ inputCount, onSubmit }: InterruptFormPositiveImpactDescriptionProps) {
  const [emptyFields, setEmptyFields] = useState<Set<number>>(new Set());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const responses = Array.from({ length: inputCount }).map((_, index) => formData.get(`brief_description${index}`) as string);

    const blanks = new Set<number>();
    responses.forEach((val, index) => {
      if (!val.trim()) blanks.add(index);
    });

    if (blanks.size > 0) {
      setEmptyFields(blanks);
      return;
    }

    const responsesJson = JSON.stringify({
      brief_descriptions: responses,
    });
    onSubmit(responsesJson);
  };

  return (
    <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Provide an initial description of the business need for the conjectural requirement(s).
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Describe the business need as a positive impact or benefit. For example:
        <span className="italic"> &quot;Reduce customer onboarding time&quot;</span>,
        <span className="italic"> &quot;Increase order tracking visibility&quot;</span>, or
        <span className="italic"> &quot;Improve data accuracy in financial reports&quot;</span>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {Array.from({ length: inputCount }).map((_, index) => (
          <div key={index}>
            <input
              type="text"
              name={`brief_description${index}`}
              placeholder={`Enter an initial description of the business need`}
              onChange={() => {
                if (emptyFields.has(index)) {
                  setEmptyFields(prev => {
                    const next = new Set(prev);
                    next.delete(index);
                    return next;
                  });
                }
              }}
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${emptyFields.has(index) ? 'border-red-500 dark:border-red-500' : 'border-border-light dark:border-border-dark'}`}
            />
          </div>
        ))}
        <div className="flex items-center gap-3 mt-4">
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors">
            Submit
          </button>
          {emptyFields.size > 0 && (
            <span className="text-xs text-red-500 dark:text-red-400">
              Required fields not filled in.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
