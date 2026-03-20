"use client";

import { useState, useCallback } from "react";
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
    uncertainties: string[];
  };
  qess: {
    solution_assumption: string;
    uncertainty_evaluated: string;
    observation_analysis: string;
  };
  evaluations: SnapshotEvaluation[];
}

interface ConjecturalDetailViewProps {
  requirement: ConjecturalRequirement;
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

  // Normalize: ConjecturalEvaluation has scores as top-level keys, SnapshotEvaluation has them in .scores
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

function HistoryAttempt({ entry }: { entry: HistorySnapshotEntry }) {
  const llmEval = entry.evaluations?.find((e) => e.type === "llm");
  const humanEval = entry.evaluations?.find((e) => e.type === "human");

  return (
    <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
      <div className="flex items-center gap-3 mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Attempt #{entry.attempt}
        </h4>
        {entry.ranking && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            entry.ranking === 1
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}>
            Rank #{entry.ranking}
          </span>
        )}
      </div>

      {/* FERC */}
      <div className="space-y-3 mb-4">
        <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
            It is expected that the software system has&nbsp;
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.ferc.desired_behavior}</span>
        </div>
        <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">So that&nbsp;</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.ferc.positive_impact}</span>
        </div>
        <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">However, we do not know:&nbsp;</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.ferc.uncertainties.join("; ")}</span>
        </div>
      </div>

      {/* QESS */}
      <div className="space-y-3 mb-4">
        <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">We expect that&nbsp;</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.qess.solution_assumption}</span>
        </div>
        <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Will result in updating the uncertainties about&nbsp;</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.qess.uncertainty_evaluated}</span>
        </div>
        <div className="rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">As a result of&nbsp;</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.qess.observation_analysis}</span>
        </div>
      </div>

      {/* Evaluations */}
      {(llmEval || humanEval) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {llmEval && <EvaluationCard label="LLM-as-Judge" evaluation={llmEval} />}
          {humanEval && <EvaluationCard label="Human" evaluation={humanEval} />}
        </div>
      )}
    </div>
  );
}

export default function ConjecturalDetailView({
  requirement,
  userId,
  onClose,
  onSaved,
}: ConjecturalDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("ferc");
  const [saving, setSaving] = useState(false);

  const historyEntries: HistorySnapshotEntry[] = (requirement.history_snapshot as HistorySnapshotEntry[]) ?? [];

  // Editable fields
  const [desiredBehavior, setDesiredBehavior] = useState(requirement.desired_behavior);
  const [positiveImpact, setPositiveImpact] = useState(requirement.positive_impact);
  const [uncertainties, setUncertainties] = useState(requirement.uncertainties.join("\n"));
  const [solutionAssumption, setSolutionAssumption] = useState(requirement.solution_assumption);
  const [uncertaintyEvaluated, setUncertaintyEvaluated] = useState(requirement.uncertainty_evaluated);
  const [observationAnalysis, setObservationAnalysis] = useState(requirement.observation_analysis);


  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/conjectural-requirements/${requirement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
        body: JSON.stringify({
          desired_behavior: desiredBehavior,
          positive_impact: positiveImpact,
          uncertainties: uncertainties.split("\n").map((u) => u.trim()).filter(Boolean),
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
  }, [requirement.id, userId, desiredBehavior, positiveImpact, uncertainties, solutionAssumption, uncertaintyEvaluated, observationAnalysis, onSaved]);

  return (
    <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {requirement.requirement_id ?? "Conjectural Requirement"}
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
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4">
        <TabButton label="FERC" active={activeTab === "ferc"} onClick={() => setActiveTab("ferc")} />
        <TabButton label="QESS" active={activeTab === "qess"} onClick={() => setActiveTab("qess")} />
        <TabButton label="History" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6 h-155 overflow-y-auto">
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
                  value={uncertainties}
                  onChange={(e) => setUncertainties(e.target.value)}
                  placeholder="One uncertainty per line..."
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
          <div className="space-y-4">
            {historyEntries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
                No history available.
              </p>
            ) : (
              historyEntries.map((entry, i) => (
                <HistoryAttempt key={i} entry={entry} />
              ))
            )}
          </div>
        )}
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
