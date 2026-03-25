"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Settings, Check, Bot  } from "lucide-react";

interface StepState {
  step1_elicitation: boolean;
  step2_analysis: boolean;
  step3_specification: boolean;
  step4_validation: boolean;
  pending_progress: boolean;
}

interface StepProgressProps {
  status: string;
  state: StepState;
  nodeName?: string;
  runId?: string;
}

const steps = [
  { key: "step1_elicitation", label: "Elicitation" },
  { key: "step2_analysis", label: "Analysis" },
  { key: "step3_specification", label: "Specification" },
  { key: "step4_validation", label: "Validation" },
] as const;

const CHECK_DISPLAY_MS = 300;

// Total phases: 0..8
// Even phase (0,2,4,6) = spinner for step at index phase/2
// Odd phase (1,3,5,7) = check for step at index (phase-1)/2
// Phase 8 = all done

function OverlayCard({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 dark:bg-black/50">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white/90 dark:bg-surface-dark/95 p-10 shadow-2xl backdrop-blur-sm border border-border-light dark:border-border-dark min-w-[340px]">
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function StepProgress({ state }: StepProgressProps) {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    phaseRef.current += 1;
    setPhase(phaseRef.current);
  }, []);

  // Extract boolean values to use as stable deps
  const s1 = state.step1_elicitation;
  const s2 = state.step2_analysis;
  const s3 = state.step3_specification;
  const s4 = state.step4_validation;

  const pending = state.pending_progress;

  useEffect(() => {
    // Don't advance phases until pending_progress is true
    if (!pending) return;

    const p = phaseRef.current;

    // Detect the validation→specification loop: when the coordinator loops
    // back, s3 becomes false while the phase is already past specification.
    // Reset back to the specification spinner (phase 4).
    if (!s3 && p > 4) {
      phaseRef.current = 4;
      timerRef.current = setTimeout(() => setPhase(4), 0);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const stepIndex = Math.floor(p / 2);
    const isCheckPhase = p % 2 === 1;

    // All done
    if (stepIndex >= steps.length) return;

    if (isCheckPhase) {
      // Check phase: wait 300ms then advance to next spinner
      timerRef.current = setTimeout(advance, CHECK_DISPLAY_MS);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // Spinner phase: check if the corresponding state is already true
    const completedValues = [s1, s2, s3, s4];
    if (completedValues[stepIndex]) {
      // State is true — move to check phase immediately
      advance();
    }

    // If not completed, do nothing — wait for next state change to re-evaluate
  }, [phase, s1, s2, s3, s4, pending, advance]);

  const stepIndex = Math.floor(phase / 2);
  const currentStep = stepIndex < steps.length ? steps[stepIndex] : null;

  if (!state.pending_progress) {
    return (
      <OverlayCard>
        <Settings
          className="h-12 w-12 text-orange-500 dark:text-orange-400 animate-spin"
          style={{ animationDuration: "3s" }}
        />
        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Processing request...
        </span>
      </OverlayCard>
    );
  }

  if (!currentStep) {
    return (
      <OverlayCard>
        <Check className="h-12 w-12 text-green-500" />
        <span className="text-lg font-medium text-green-600 dark:text-green-400">
          Complete!
        </span>
        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 w-full" />
        </div>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard>
      <Bot
        className="h-12 w-12 inline-block text-orange-500 dark:text-orange-400 animate-pulse"
        style={{ animationDuration: "1.2s" }}
      />

      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          {currentStep.label} in progress
        </span>
        <span
          className="text-2xl text-orange-500 dark:text-orange-400 loading-dots"
          aria-label="Processing">
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
          style={{ width: `${(phase / (steps.length * 2)) * 100}%` }}
        />
      </div>
    </OverlayCard>
  );
}
