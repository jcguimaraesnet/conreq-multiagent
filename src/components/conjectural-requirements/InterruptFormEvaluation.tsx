"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface RequirementItem {
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

interface InterruptFormEvaluationProps {
  requirements: RequirementItem[];
  onResolve: (response: string) => void;
}

export default function InterruptFormEvaluation({ requirements, onResolve }: InterruptFormEvaluationProps) {
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
