"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageTitle from '@/components/ui/PageTitle';
import KanbanBoard from '@/components/conjectural-requirements/KanbanBoard';
import KanbanToolbar from '@/components/conjectural-requirements/KanbanToolbar';
import type { DisplayField } from '@/components/conjectural-requirements/KanbanToolbar';
import { useProject } from '@/contexts/ProjectContext';
import { useRequirements } from '@/contexts/RequirementsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useInterrupt } from "@copilotkit/react-core/v2";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { useComponent, useRenderTool, ToolCallStatus } from "@copilotkit/react-core/v2";
import { useAgentContext } from "@copilotkit/react-core/v2";
import { useAgent } from "@copilotkit/react-core/v2";
import { useConfigureSuggestions } from "@copilotkit/react-core/v2";
import StepProgress from '@/components/requirements/StepProgress';
import InterruptForm from '@/components/requirements/InterruptForm';
import Spinner from "@/components/ui/Spinner";
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import type { ConjecturalRequirement, ConjecturalEvaluation, ConjecturalStatus } from '@/types';
import { useOnborda } from 'onborda';
import { X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from "zod";
import EvaluationRadarCard from '@/components/conjectural-requirements/EvaluationRadarCard';


const TOAST_DURATION_MS = 5000;

interface AgentState {
  run_id: string;
  user_id: string;
  project_id: string;
  require_brief_description: boolean;
  batch_mode: boolean;
  quantity_req_batch: number;
  step1_elicitation: boolean;
  step2_analysis: boolean;
  step3_specification: boolean;
  step4_validation: boolean;
  pending_progress: boolean;
}

interface RequirementItem {
  requirement_number: number;
  attempt: number;
  desired_behavior: string;
  positive_impact: string;
  uncertainties: string;
  solution_assumption: string;
  uncertainty_evaluated: string;
  observation_analysis: string;
}

const QUALITY_CRITERIA = [
  { key: "unambiguous", label: "Unambiguous" },
  { key: "completeness", label: "Completeness" },
  { key: "atomicity", label: "Atomicity" },
  { key: "verifiable", label: "Verifiable" },
  { key: "conforming", label: "Conforming" },
] as const;

const LIKERT_LABELS: Record<number, string> = {
  1: "Very Poor",
  2: "Poor",
  3: "Regular",
  4: "Good",
  5: "Very Good",
};

interface EvaluationData {
  scores: Partial<Record<string, number>>;
  justifications: Partial<Record<string, string>>;
}

type Evaluations = Record<number, EvaluationData>;

function isRequirementEvaluated(evalData?: EvaluationData): boolean {
  if (!evalData) return false;
  return QUALITY_CRITERIA.every(({ key }) => {
    const score = evalData.scores[key];
    if (score == null) return false;
    if (score < 5 && !evalData.justifications[key]?.trim()) return false;
    return true;
  });
}

function SingleCard({
  req,
  allRequirements,
  evaluations,
  onUpdateScore,
  onUpdateJustification,
}: {
  req: RequirementItem;
  allRequirements: RequirementItem[];
  evaluations: Evaluations;
  onUpdateScore: (reqNumber: number, criterion: string, score: number) => void;
  onUpdateJustification: (reqNumber: number, criterion: string, text: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ferc" | "qess">("ferc");
  const [modalIndex, setModalIndex] = useState(0);

  const openModal = () => {
    const idx = allRequirements.findIndex(r => r.requirement_number === req.requirement_number);
    setModalIndex(idx >= 0 ? idx : 0);
    setShowModal(true);
  };

  const goPrev = useCallback(() => {
    setModalIndex(i => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setModalIndex(i => (i < allRequirements.length - 1 ? i + 1 : i));
  }, [allRequirements.length]);

  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "Tab") { e.preventDefault(); setActiveTab(t => t === "ferc" ? "qess" : "ferc"); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setShowModal(false); }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [showModal, goPrev, goNext]);

  const current = allRequirements[modalIndex] || req;
  const hasPrev = modalIndex > 0;
  const hasNext = modalIndex < allRequirements.length - 1;

  return (
    <>
      <div
        onClick={openModal}
        className="group rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 p-3 mt-6 mb-2 relative w-62 shrink-0 h-65 overflow-hidden transition-colors cursor-pointer hover:border-orange-300 dark:hover:border-orange-600">
        <div className="absolute top-0.5 right-2 p-0.5 text-orange-400">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <span className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg shadow-lg">
            Evaluate
          </span>
        </div>
        {/* Status badge */}
        <div className="absolute top-2 left-2 z-10">
          {isRequirementEvaluated(evaluations[req.requirement_number]) ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              Evaluated
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
              Pending
            </span>
          )}
        </div>
        <div className="flex flex-col items-center h-full">
          <div className="font-bold text-orange-600 dark:text-orange-400 text-lg mt-7 mb-4 text-center">
            Conjectural Req #{req.requirement_number}
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-200 line-clamp-11 text-center">
            <strong>It is expected that the software system has </strong>
            {req.desired_behavior}
          </p>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-9999 flex items-start justify-center bg-black/60 p-4 pt-[15vh]" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Conjectural Requirement #{current.requirement_number}
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    Attempt #{current.attempt}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className="p-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Previous requirement"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goNext}
                  disabled={!hasNext}
                  className="p-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Next requirement"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 px-6 pt-4">
              <button
                onClick={() => setActiveTab("ferc")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "ferc"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                FERC
              </button>
              <button
                onClick={() => setActiveTab("qess")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "qess"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                QESS
              </button>
            </div>

            <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
              {activeTab === "ferc" ? (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      It is expected that the software system has&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {current.desired_behavior || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      So that&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {current.positive_impact || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <p className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-2">
                      However, we do not know:
                    </p>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      <strong className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider">Uncertainty:</strong> {current.uncertainties || "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      We expect that&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {current.solution_assumption || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      Will result in updating the uncertainties about&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {current.uncertainty_evaluated || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      As a result of&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {current.observation_analysis || "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Evaluation Form */}
              <div className="border-t border-border-light dark:border-border-dark mt-6 pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Evaluation</h3>
                  {isRequirementEvaluated(evaluations[current.requirement_number]) ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      Evaluated
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                      Pending
                    </span>
                  )}
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 pb-2 w-[140px]">Criterion</th>
                      <th className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 pb-2 w-[180px]">Score</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 pb-2 pl-7">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUALITY_CRITERIA.map(({ key, label }) => {
                      const evalData = evaluations[current.requirement_number];
                      const score = evalData?.scores[key];
                      const justification = evalData?.justifications[key] ?? "";
                      const needsJustification = score != null && score < 5;

                      return (
                        <tr key={key} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2 pr-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1 justify-center">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  title={LIKERT_LABELS[value]}
                                  onClick={() => onUpdateScore(current.requirement_number, key, value)}
                                  className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                                    score === value
                                      ? "bg-orange-500 text-white shadow-sm"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400"
                                  }`}
                                >
                                  {value}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 pl-7">
                            {needsJustification && (
                              <input
                                type="text"
                                value={justification}
                                onChange={(e) => onUpdateJustification(current.requirement_number, key, e.target.value)}
                                placeholder={`Justify your ${label.toLowerCase()} score...`}
                                className="w-full rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t border-border-light dark:border-border-dark mt-2 px-6 py-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const INTRO_TEXT = "Conjectural requirements have been generated. Click on each card to evaluate the requirement, then submit your evaluations.";
const TYPEWRITER_SPEED_MS = 80;
const INTRO_WORDS = INTRO_TEXT.split(" ");
const CARD_REVEAL_DELAY_MS = 300;

function RequirementApprovalForm({ requirements, onResolve }: { requirements: RequirementItem[]; onResolve: (response: string) => void }) {
  const [evaluations, setEvaluations] = useState<Evaluations>({});
  const [displayedWords, setDisplayedWords] = useState(0);
  const [visibleCards, setVisibleCards] = useState(0);
  const textDone = displayedWords >= INTRO_WORDS.length;
  const allCardsVisible = visibleCards >= requirements.length;

  // Typewriter effect for intro text (word by word)
  useEffect(() => {
    if (displayedWords >= INTRO_WORDS.length) return;
    const timer = setTimeout(() => setDisplayedWords(w => w + 1), TYPEWRITER_SPEED_MS);
    return () => clearTimeout(timer);
  }, [displayedWords]);

  // Reveal cards one by one after text finishes
  useEffect(() => {
    if (!textDone || visibleCards >= requirements.length) return;
    const timer = setTimeout(() => setVisibleCards(v => v + 1), CARD_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [textDone, visibleCards, requirements.length]);

  const handleUpdateScore = useCallback((reqNumber: number, criterion: string, score: number) => {
    setEvaluations(prev => {
      const existing = prev[reqNumber] || { scores: {}, justifications: {} };
      const updatedJustifications = { ...existing.justifications };
      // Clear justification when score is 5 (not required)
      if (score === 5) {
        delete updatedJustifications[criterion];
      }
      return {
        ...prev,
        [reqNumber]: {
          scores: { ...existing.scores, [criterion]: score },
          justifications: updatedJustifications,
        },
      };
    });
  }, []);

  const handleUpdateJustification = useCallback((reqNumber: number, criterion: string, text: string) => {
    setEvaluations(prev => {
      const existing = prev[reqNumber] || { scores: {}, justifications: {} };
      return {
        ...prev,
        [reqNumber]: {
          ...existing,
          justifications: { ...existing.justifications, [criterion]: text },
        },
      };
    });
  }, []);

  const allEvaluated = requirements.every(r => isRequirementEvaluated(evaluations[r.requirement_number]));

  const handleSubmit = () => {
    onResolve(JSON.stringify({ action: "evaluate", evaluations }));
  };

  return (
    <div className="mt-4 mb-2">
      <p className="text-base text-gray-800 dark:text-gray-200 mb-3">
        {INTRO_WORDS.slice(0, displayedWords).join(" ")}
        {!textDone && <span className="inline-block w-0.5 h-4 bg-gray-800 dark:bg-gray-200 align-text-bottom animate-pulse" />}
      </p>
      {textDone && (
        <div className="flex gap-3 overflow-x-auto">
          {requirements.slice(0, visibleCards).map((req) => (
            <div
              key={req.requirement_number}
              className="relative shrink-0 animate-[fadeSlideIn_0.35s_ease-out_forwards]"
            >
              <SingleCard
                req={req}
                allRequirements={requirements}
                evaluations={evaluations}
                onUpdateScore={handleUpdateScore}
                onUpdateJustification={handleUpdateJustification}
              />
            </div>
          ))}
        </div>
      )}
      {allCardsVisible && (
        <div className="mt-3 animate-[fadeSlideIn_0.35s_ease-out_forwards]">
          <button
            onClick={handleSubmit}
            disabled={!allEvaluated}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Submit Evaluations
          </button>
        </div>
      )}
    </div>
  );
}

type RequirementsMap = Record<string, RequirementItem[]>;

function DisplayCard({ req }: { req: RequirementItem }) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ferc" | "qess">("ferc");

  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") { e.preventDefault(); setActiveTab(t => t === "ferc" ? "qess" : "ferc"); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setShowModal(false); }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [showModal]);

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="group rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 p-3 mt-6 mb-2 relative w-62 shrink-0 h-65 overflow-hidden transition-colors cursor-pointer hover:border-orange-300 dark:hover:border-orange-600">
        <div className="absolute top-0.5 right-2 p-0.5 text-orange-400">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col items-center h-full">
          <div className="font-bold text-orange-600 dark:text-orange-400 text-lg mt-7 mb-4 text-center">
            Conjectural Req #{req.requirement_number}
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-200 line-clamp-11 text-center">
            <strong>It is expected that the software system has </strong>
            {req.desired_behavior}
          </p>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-9999 flex items-start justify-center bg-black/60 p-4 pt-[15vh]" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Conjectural Requirement #{req.requirement_number}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 px-6 pt-4">
              <button
                onClick={() => setActiveTab("ferc")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "ferc"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                FERC
              </button>
              <button
                onClick={() => setActiveTab("qess")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "qess"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                QESS
              </button>
            </div>

            <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
              {activeTab === "ferc" ? (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      It is expected that the software system has&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {req.desired_behavior || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      So that&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {req.positive_impact || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <p className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-2">
                      However, we do not know:
                    </p>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      <strong className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider">Uncertainty:</strong> {req.uncertainties || "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      We expect that&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {req.solution_assumption || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      Will result in updating the uncertainties about&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {req.uncertainty_evaluated || "N/A"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/40 p-5">
                    <span className="text-base font-semibold text-orange-600 dark:text-orange-400 tracking-wider mb-3">
                      As a result of&nbsp;
                    </span>
                    <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {req.observation_analysis || "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border-light dark:border-border-dark mt-2 px-6 py-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function ShowRequirements({ json_requirements }: { json_requirements: string }) {
  const requirementsMap: RequirementsMap = JSON.parse(json_requirements);
  const entries = Object.entries(requirementsMap);
  const [visibleCards, setVisibleCards] = useState(0);

  useEffect(() => {
    if (visibleCards >= entries.length) return;
    const timer = setTimeout(() => setVisibleCards(v => v + 1), CARD_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visibleCards, entries.length]);

  return (
    <div className="mt-4 mb-2">
      <div className="flex gap-3 overflow-x-auto">
        {entries.slice(0, visibleCards).map(([key, attempts]) => {
          const firstAttempt = attempts[0];
          if (!firstAttempt) return null;
          return (
            <div
              key={key}
              className="relative shrink-0 animate-[fadeSlideIn_0.35s_ease-out_forwards]"
            >
              <DisplayCard req={firstAttempt} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomInput({ inProgress, onSend }: { inProgress: boolean; onSend: (text: string) => void }) {
  const { agent } = useAgent({ agentId: "conjec-req-agent" });
  const [text, setText] = useState("");
  return (
    <div className="p-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask me anything about the current project"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !inProgress && text.trim()) {
            e.preventDefault();
            agent.setState({
              ...agent.state,
              tool_called: false,
            });
            onSend(text);
            setText("");
          }
        }}
      />
      <div className="flex items-center justify-between">
        <Button disabled={inProgress || !text.trim()} 
        onClick={() => { 
          onSend(text); 
          setText(""); }}>Send</Button>
        {agent.isRunning && <StepProgress status="InProgress" state={agent.state} />}
      </div>
    </div>
  );
}

function ConjecturalRequirementsInner() {
  const { agent } = useAgent({ agentId: "conjec-req-agent" });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedProject, selectProjectById, projects, isLoading: isLoadingProjects } = useProject();
  const {
    currentProjectId,
    fetchRequirements,
    clearRequirements
  } = useRequirements();

  useAgentContext({
    description: "CurrentUser",
    value: user ? JSON.parse(JSON.stringify(user)) : undefined,
  });

  useAgentContext({
    description: "CurrentProjectId",
    value: selectedProject?.id ?? "",
  });

  useAgentContext({
    description: "CurrentUserSettings",
    value: { ...settings },
  });

  useInterrupt({
    agentId: "conjec-req-agent",
    enabled: (event) => JSON.parse(event.value).type === 'hitl_brief_description',
    render: ({ event, resolve }) => {
      const quantity_req_batch = JSON.parse(event.value).quantity_req_batch || settings.quantity_req_batch;
      return (
              <InterruptForm
                inputCount={quantity_req_batch}
                onSubmit={resolve}
              />
      )
    }
  });

  useInterrupt({
    agentId: "conjec-req-agent",
    enabled: (event) => JSON.parse(event.value).type === "hitl_req_approve",
    render: ({ event, resolve }) => {
            const requirements: RequirementItem[] = JSON.parse(event.value).requirements || [];
            return (
              <RequirementApprovalForm requirements={requirements} onResolve={resolve} />
            );
    }
  });
  
  useFrontendTool({
    name: "consoleLog",
    description: "Display a message in the console",
    parameters: z.object({
      message: z.string().describe("The message to display"),
    }),
    followUp: false,
    handler: async ({ message }: { message: string }) => {
      console.log(message);
      return { success: true };
    },
  }, []);

  const paramSchema = z.object({ requirement_ids: z.string().describe("The JSON string containing requirement ids") });

  useFrontendTool({
    name: "show_requirements",
    followUp: false,
    parameters: paramSchema,
    handler: async ({ requirement_ids }) => {
      const ids: string[] = JSON.parse(requirement_ids);

      //step 1: Fetch each requirement by ID in parallel
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await fetch(`${API_URL}/api/conjectural-requirements/${id}`, {
            headers: { Authorization: `Bearer ${user?.id || ""}` },
          });
          if (!res.ok) return null;
          return res.json();
        })
      );

      const newRequirements: ConjecturalRequirement[] = results
        .filter((r): r is PromiseFulfilledResult<ConjecturalRequirement> =>
          r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value);

      //step 2: Add to kanban state with animation flag
      setNewCardIds(new Set(newRequirements.map((r) => r.id)));
      setKanbanRequirements((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const toAdd = newRequirements.filter((r) => !existingIds.has(r.id));
        return [...toAdd, ...prev];
      });

      //step 3: mount evaluations object to forward as result parameter on render function
      const firstReq = newRequirements[0] ?? null;
      const evaluations = firstReq?.evaluations ?? [];

      return { evaluations, requirementId: firstReq?.requirement_id ?? null };
    },
    render: ({ status, result }) => {
      if (status !== ToolCallStatus.Complete || !result) return null;

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      const evaluations: ConjecturalEvaluation[] = parsed?.evaluations ?? [];
      const requirementId: string | null = parsed?.requirementId ?? null;

      return <EvaluationRadarCard evaluations={evaluations} requirementId={requirementId} />;
    },
  }, [API_URL, user?.id]);

  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams.get('projectId');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastProgress, setToastProgress] = useState(100);

  // Kanban board state
  const [kanbanDisplayField, setKanbanDisplayField] = useState<DisplayField>("desired_behavior");
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState("");
  const [kanbanRequirements, setKanbanRequirements] = useState<ConjecturalRequirement[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  // Select project from query string when projects are loaded
  useEffect(() => {
    if (!projectIdFromQuery) {
      return;
    }
    if (projects.length > 0 && !isLoadingProjects) {
      selectProjectById(projectIdFromQuery);
    }
  }, [projectIdFromQuery, projects, isLoadingProjects, selectProjectById]);

  // Clear requirements when project ID is invalid
  const projectNotFound = !!projectIdFromQuery && !isLoadingProjects && projects.length > 0 && !selectedProject;
  useEffect(() => {
    if (projectNotFound) {
      clearRequirements();
    }
  }, [projectNotFound, clearRequirements]);

  // Fetch requirements when project changes (only if not already cached)
  useEffect(() => {
    if (!selectedProject?.id || !projectIdFromQuery) {
      return;
    }

    // Skip if requirements are already loaded for this project
    if (currentProjectId === selectedProject.id) {
      return;
    }

    // Build author name from project
    const projectAuthor = [selectedProject.author_first_name, selectedProject.author_last_name]
      .filter(Boolean)
      .join(' ') || selectedProject.author || 'Unknown';

    fetchRequirements(selectedProject.id, projectAuthor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, projectIdFromQuery, currentProjectId, fetchRequirements]);

  // Fetch kanban conjectural requirements (ranking = 1 only)
  const fetchKanbanRequirements = useCallback(async (projectId: string) => {
    setKanbanLoading(true);
    setKanbanError(null);
    try {
      const res = await fetch(`${API_URL}/api/conjectural-requirements/project/${projectId}`, {
        headers: { Authorization: `Bearer ${user?.id || ""}` },
      });
      if (!res.ok) throw new Error("Failed to fetch conjectural requirements");
      const data: ConjecturalRequirement[] = await res.json();
      setKanbanRequirements(data);
    } catch (err) {
      setKanbanError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setKanbanLoading(false);
    }
  }, [API_URL, user?.id]);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchKanbanRequirements(selectedProject.id);
    }
  }, [selectedProject?.id, fetchKanbanRequirements]);

  // Kanban status change handler
  const handleKanbanStatusChange = useCallback(async (requirementId: string, newStatus: ConjecturalStatus) => {
    // Optimistic update
    setKanbanRequirements((prev) =>
      prev.map((r) => (r.id === requirementId ? { ...r, status: newStatus } : r))
    );
    try {
      const res = await fetch(`${API_URL}/api/conjectural-requirements/${requirementId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.id || ""}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch {
      // Revert on failure
      if (selectedProject?.id) fetchKanbanRequirements(selectedProject.id);
    }
  }, [API_URL, user?.id, selectedProject?.id, fetchKanbanRequirements]);

  // Kanban search filter
  const filteredKanbanRequirements = useMemo(() => {
    if (!kanbanSearchQuery) return kanbanRequirements;
    const q = kanbanSearchQuery.toLowerCase();
    return kanbanRequirements.filter(
      (r) =>
        r.desired_behavior.toLowerCase().includes(q) ||
        r.positive_impact.toLowerCase().includes(q) ||
        r.uncertainties.some((u) => u.toLowerCase().includes(q))
    );
  }, [kanbanRequirements, kanbanSearchQuery]);

  const handleKanbanClear = () => setKanbanSearchQuery("");

  // Toast progress animation
  useEffect(() => {
    if (!successMessage) {
      return;
    }

    setToastProgress(100);
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / TOAST_DURATION_MS);
      setToastProgress(Math.round(remaining * 100));
    }, 50);

    const timeoutId = setTimeout(() => {
      setSuccessMessage(null);
    }, TOAST_DURATION_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const handleDismissSuccess = () => {
    setSuccessMessage(null);
  };

  return (
    <>
      <PageTitle title="Conjectural Requirements" backHref="/projects" backLabel="Back Projects" />
      {successMessage && (
        <div className="fixed top-24 right-6 z-50 w-80 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-800 dark:text-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-green-600 dark:text-green-400">Success</div>
              <p className="mt-1 text-gray-600 dark:text-gray-300">{successMessage}</p>
            </div>
            <button
              onClick={handleDismissSuccess}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
          <div className="mt-3 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-green-500 dark:bg-green-400 transition-[width] duration-100 ease-linear"
              style={{ width: `${toastProgress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}


      {(!projectIdFromQuery || (!isLoadingProjects && projects.length > 0 && !selectedProject)) && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            Project not found. Select a valid project to view its conjectural requirements.
          </p>
        </div>
      )}

      <KanbanToolbar
        searchQuery={kanbanSearchQuery}
        setSearchQuery={setKanbanSearchQuery}
        displayField={kanbanDisplayField}
        onToggleField={setKanbanDisplayField}
        onClear={handleKanbanClear}
      />

      <KanbanBoard
        requirements={filteredKanbanRequirements}
        displayField={kanbanDisplayField}
        userId={user?.id || ""}
        isLoading={kanbanLoading}
        error={kanbanError}
        newCardIds={newCardIds}
        onAnimationComplete={() => setNewCardIds(new Set())}
        onStatusChange={handleKanbanStatusChange}
        onRequirementUpdated={(updated) => {
          setKanbanRequirements((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
        }}
      />
    </>
  );
}

export default function ConjecturalRequirementsPage() {
  const searchParamsOuter = useSearchParams();
  const { startOnborda } = useOnborda();

  // Start chatbot-suggestion-tour when arriving via query string
  useEffect(() => {
    if (searchParamsOuter.get('tour') === 'chatbot-suggestion') {
      const timer = setTimeout(() => startOnborda('chatbot-suggestion-tour'), 800);
      return () => clearTimeout(timer);
    }
  }, [searchParamsOuter, startOnborda]);

  useConfigureSuggestions({
    suggestions: [
        {
          title: "Generate conjectural requirements",
          message: "Generate conjectural requirements for the current project.",
        },
        {
          title: "Quantity conjectural",
          message: "How many conjectural requirements are there in the current project?",
        },
    ],
    available: "always",
  });

  return (
    <CopilotSidebar
      Input={CustomInput}
      clickOutsideToClose={false}
      defaultOpen={true}
      hideStopButton={false}
      labels={{
        title: "Multi-Agent AI for Conjectural Requirements",
        initial: "\u{1F44B} Hi, I'm ready to answer anything about the current project.",
        placeholder: "Ask me anything about the current project",
        stopGenerating: "Stop",
      }}
      icons={{
        spinnerIcon: <Spinner size='lg' />,
        stopIcon: <span className="inline-block w-4 h-4 bg-red-400 border border-red-600 rounded-sm" />,
      }}>
      <AppLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        }>
          <ConjecturalRequirementsInner />
        </Suspense>
      </AppLayout>
    </CopilotSidebar>
  );
}
