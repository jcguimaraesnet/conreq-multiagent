"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Save } from "lucide-react";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { ConjecturalRequirement, ConjecturalEvaluation } from "@/types";

type Tab = "ferc" | "qess" | "history";

interface SnapshotEvaluation {
  type: "llm" | "human";
  scores: Record<string, number>;
  justifications: Record<string, string>;
  overall_score: number;
}

interface HistorySnapshotEntry {
  attempt: number;
  ranking: number | null;
  ferc: {
    desired_behavior: string;
    positive_impact: string;
    uncertainty: string;
  };
  qess: {
    solution_assumption: string;
    uncertainty_evaluated: string;
    observation_analysis: string;
  };
  evaluations: SnapshotEvaluation[];
}

interface ConjecturalDetailViewProps {
  open: boolean;
  requirement: ConjecturalRequirement | null;
  userId: string;
  onClose: () => void;
  onSaved: (updated: ConjecturalRequirement) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

function EvaluationCard({ label, evaluation }: { label: string; evaluation: ConjecturalEvaluation | SnapshotEvaluation }) {
  const criteriaKeys = ["unambiguous", "completeness", "atomicity", "verifiable", "conforming"] as const;
  const criteriaLabels: Record<string, string> = {
    unambiguous: "Unambiguous",
    completeness: "Completeness",
    atomicity: "Atomicity",
    verifiable: "Verifiable",
    conforming: "Conforming",
  };

  const getScore = (key: string): number => {
    if ("scores" in evaluation) return evaluation.scores[key] ?? 0;
    return (evaluation as ConjecturalEvaluation)[key as keyof ConjecturalEvaluation] as number ?? 0;
  };

  const getJustification = (key: string): string | undefined => {
    return evaluation.justifications?.[key];
  };

  return (
    <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-bold text-primary">{evaluation.overall_score.toFixed(1)}/5</span>
      </div>
      <div className="space-y-2">
        {criteriaKeys.map((key) => {
          const score = getScore(key);
          const justification = getJustification(key);
          return (
            <div key={key}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{criteriaLabels[key]}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-4 text-right">
                    {score}
                  </span>
                </div>
              </div>
              {justification && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-1 italic">
                  {justification}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type HistorySubTab = "ferc" | "qess" | "evaluations";

function HistoryPanel({ entries }: { entries: HistorySnapshotEntry[] }) {
  const [selectedAttempt, setSelectedAttempt] = useState(0);
  const [subTab, setSubTab] = useState<HistorySubTab>("ferc");

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
        No history available.
      </p>
    );
  }

  const entry = selectedAttempt < entries.length ? entries[selectedAttempt] : null;
  const llmEval = entry?.evaluations?.find((e) => e.type === "llm");
  const humanEval = entry?.evaluations?.find((e) => e.type === "human");

  const slots = [1, 2, 3];

  return (
    <div className="space-y-4">
      {/* Level 2 — Attempt selector */}
      <div className="ml-0 flex items-center gap-3">
        <div className="inline-flex items-center gap-4 rounded-xl border border-border-light dark:border-border-dark px-4 py-2">
        {slots.map((num) => {
          const entryForSlot = entries.find((e) => e.attempt === num);
          const exists = !!entryForSlot;
          const slotIndex = exists ? entries.indexOf(entryForSlot!) : -1;
          const isSelected = exists && slotIndex === selectedAttempt;
          const isRank1 = entryForSlot?.ranking === 1;

          return (
            <button
              key={num}
              disabled={!exists}
              onClick={() => { if (exists) { setSelectedAttempt(slotIndex); } }}
              className={`w-8 h-8 rounded-full text-xs font-semibold transition-all
                ${!exists
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-40"
                  : isSelected
                    ? `shadow-md ${isRank1 ? "" : "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-red-300"}`
                    : "opacity-70 hover:opacity-100"
                }
                ${exists && isRank1
                  ? "bg-green-500 text-white"
                  : exists
                    ? "bg-red-400/80 text-white"
                    : ""
                }`}
            >
              {num}
            </button>
          );
        })}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">attempts</span>
      </div>

      {/* Level 3 — Sub-tabs (FERC / QESS / Evaluations) */}
      {entry && (
        <>
          <div className="inline-flex gap-2 rounded-xl border border-border-light dark:border-border-dark px-1.5 py-1.5">
            <TabButton label="FERC" active={subTab === "ferc"} onClick={() => setSubTab("ferc")} />
            <TabButton label="QESS" active={subTab === "qess"} onClick={() => setSubTab("qess")} />
            <TabButton label="EVALUATIONS" active={subTab === "evaluations"} onClick={() => setSubTab("evaluations")} />
          </div>

          {/* Sub-tab content */}
          {subTab === "ferc" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">
                  It is expected that the software system has&nbsp;
                </span>
                <span className="text-base text-gray-700 dark:text-gray-300">{entry.ferc.desired_behavior}</span>
              </div>
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">So that&nbsp;</span>
                <span className="text-base text-gray-700 dark:text-gray-300">{entry.ferc.positive_impact}</span>
              </div>
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">However, we do not know:&nbsp;</span>
                <span className="text-base text-gray-700 dark:text-gray-300">{entry.ferc.uncertainty}</span>
              </div>
            </div>
          )}

          {subTab === "qess" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">We expect that&nbsp;</span>
                <span className="text-base text-gray-700 dark:text-gray-300">{entry.qess.solution_assumption}</span>
              </div>
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">Will result in updating the uncertainties about&nbsp;</span>
                <span className="text-base text-gray-700 dark:text-gray-300">{entry.qess.uncertainty_evaluated}</span>
              </div>
              <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4">
                <span className="text-base font-semibold text-orange-600 dark:text-orange-400">As a result of&nbsp;</span>
                <span className="text-base text-gray-700 dark:text-gray-300">{entry.qess.observation_analysis}</span>
              </div>
            </div>
          )}

          {subTab === "evaluations" && (
            <div>
              {!llmEval && !humanEval ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No evaluations available for this attempt.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {llmEval && <EvaluationCard label="LLM-as-Judge" evaluation={llmEval} />}
                  {humanEval ? (
                    <EvaluationCard label="Human" evaluation={humanEval} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Human</span>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        There was no human evaluation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ConjecturalDetailView({
  open,
  requirement,
  userId,
  onClose,
  onSaved,
}: ConjecturalDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("ferc");
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [desiredBehavior, setDesiredBehavior] = useState("");
  const [positiveImpact, setPositiveImpact] = useState("");
  const [uncertainty, setUncertainty] = useState("");
  const [solutionAssumption, setSolutionAssumption] = useState("");
  const [uncertaintyEvaluated, setUncertaintyEvaluated] = useState("");
  const [observationAnalysis, setObservationAnalysis] = useState("");

  // Reset fields when requirement changes
  useEffect(() => {
    if (requirement) {
      setDesiredBehavior(requirement.desired_behavior);
      setPositiveImpact(requirement.positive_impact);
      setUncertainty(requirement.uncertainty);
      setSolutionAssumption(requirement.solution_assumption);
      setUncertaintyEvaluated(requirement.uncertainty_evaluated);
      setObservationAnalysis(requirement.observation_analysis);
      setActiveTab("ferc");
    }
  }, [requirement]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const historyEntries: HistorySnapshotEntry[] = (requirement?.history_snapshot as HistorySnapshotEntry[]) ?? [];

  const handleSave = useCallback(async () => {
    if (!requirement) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/conjectural-requirements/${requirement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
        body: JSON.stringify({
          desired_behavior: desiredBehavior,
          positive_impact: positiveImpact,
          uncertainty,
          solution_assumption: solutionAssumption,
          uncertainty_evaluated: uncertaintyEvaluated,
          observation_analysis: observationAnalysis,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated: ConjecturalRequirement = await res.json();
      onSaved(updated);
    } catch {
      // stay open on error
    } finally {
      setSaving(false);
    }
  }, [requirement, userId, desiredBehavior, positiveImpact, uncertainty, solutionAssumption, uncertaintyEvaluated, observationAnalysis, onSaved]);

  if (!open || !requirement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Conjectural Requirement</p>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {requirement.cod_requirement ?? "Detail"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex gap-2 rounded-xl border border-border-light dark:border-border-dark px-1.5 py-1.5">
            <TabButton label="FERC" active={activeTab === "ferc"} onClick={() => setActiveTab("ferc")} />
            <TabButton label="QESS" active={activeTab === "qess"} onClick={() => setActiveTab("qess")} />
            <TabButton label="HISTORY" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-6 py-6 h-[45vh] overflow-y-auto styled-scrollbar">
          {activeTab === "ferc" && (
            <div className="space-y-5">
              <EditableField
                prefix="It is expected that the software system has"
                value={desiredBehavior}
                onChange={setDesiredBehavior}
                label="Desired Behavior"
              />
              <EditableField
                prefix="So that"
                value={positiveImpact}
                onChange={setPositiveImpact}
                label="Positive Impact"
              />
              <div>
                <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                  <p className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                    However, we do not know:
                  </p>
                  <Textarea
                    value={uncertainty}
                    onChange={(e) => setUncertainty(e.target.value)}
                    placeholder="Uncertainty..."
                    rows={3}
                    className="w-full text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "qess" && (
            <div className="space-y-5">
              <EditableField
                prefix="We expect that"
                value={solutionAssumption}
                onChange={setSolutionAssumption}
                label="Solution Assumption"
              />
              <EditableField
                prefix="Will result in updating the uncertainties about"
                value={uncertaintyEvaluated}
                onChange={setUncertaintyEvaluated}
                label="Uncertainty Evaluated"
              />
              <EditableField
                prefix="As a result of"
                value={observationAnalysis}
                onChange={setObservationAnalysis}
                label="Observation & Analysis"
              />
            </div>
          )}

          {activeTab === "history" && (
            <HistoryPanel entries={historyEntries} />
          )}
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

function EditableField({
  prefix,
  value,
  onChange,
  label,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
      <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider">
        {prefix}&nbsp;
      </span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        rows={2}
        className="w-full text-base mt-2"
      />
    </div>
  );
}
