"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageTitle from '@/components/ui/PageTitle';
import RequirementsTable from '@/components/requirements/RequirementsTable';
import ConjecturalRequirementsToolbar from '@/components/conjectural-requirements/ConjecturalRequirementsToolbar';
import { useProject } from '@/contexts/ProjectContext';
import { useRequirements } from '@/contexts/RequirementsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable, useLangGraphInterrupt } from "@copilotkit/react-core";
import { useAgent } from "@copilotkit/react-core/v2";
import StepProgress from '@/components/requirements/StepProgress';
import InterruptForm from '@/components/requirements/InterruptForm';
import Spinner from "@/components/ui/Spinner";
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { RequirementType } from '@/types';
import { X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;
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
  desired_behavior: string;
  positive_impact: string;
  uncertainties: string;
  solution_assumption: string;
  uncertainty_evaluated: string;
  observation_analysis: string;
}

function SingleCard({ req, allRequirements, onShiftClick }: { req: RequirementItem; allRequirements: RequirementItem[]; onShiftClick?: () => void }) {
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
        onClick={(e) => { if (e.shiftKey && onShiftClick) { e.preventDefault(); window.getSelection()?.removeAllRanges(); onShiftClick(); } else { openModal(); } }}
        className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 p-3 mt-6 mb-2 relative w-62 shrink-0 h-65 overflow-hidden transition-colors cursor-pointer hover:border-orange-300 dark:hover:border-orange-600">
        <div className="absolute top-0.5 right-2 p-0.5 text-orange-400">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col items-center h-full">
          <div className="font-bold text-orange-600 dark:text-orange-400 text-lg mt-3 mb-4 text-center">
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
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Conjectural Requirement #{current.requirement_number}
                  </h2>
                </div>
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

            <div className="px-6 py-6 h-[45vh] overflow-y-auto">
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

const INTRO_TEXT = "Conjectural requirements have been generated based on the provided data. Select the ones you want to approve and store in the system.";
const TYPEWRITER_SPEED_MS = 18;
const CARD_REVEAL_DELAY_MS = 300;

function RequirementApprovalForm({ requirements, onResolve }: { requirements: RequirementItem[]; onResolve: (response: string) => void }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(requirements.map(r => r.requirement_number)));
  const [displayedChars, setDisplayedChars] = useState(0);
  const [visibleCards, setVisibleCards] = useState(0);
  const textDone = displayedChars >= INTRO_TEXT.length;
  const allCardsVisible = visibleCards >= requirements.length;

  // Typewriter effect for intro text
  useEffect(() => {
    if (displayedChars >= INTRO_TEXT.length) return;
    const timer = setTimeout(() => setDisplayedChars(c => c + 1), TYPEWRITER_SPEED_MS);
    return () => clearTimeout(timer);
  }, [displayedChars]);

  // Reveal cards one by one after text finishes
  useEffect(() => {
    if (!textDone || visibleCards >= requirements.length) return;
    const timer = setTimeout(() => setVisibleCards(v => v + 1), CARD_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [textDone, visibleCards, requirements.length]);

  const toggleSelection = (reqNumber: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(reqNumber)) {
        next.delete(reqNumber);
      } else {
        next.add(reqNumber);
      }
      return next;
    });
  };

  const handleApprove = () => {
    const approved = requirements
      .filter(r => selected.has(r.requirement_number))
      .map(r => r.requirement_number);
    onResolve(JSON.stringify({ action: "approve", requirement_numbers: approved }));
  };

  const handleReject = () => {
    onResolve(JSON.stringify({ action: "reject", requirement_numbers: [] }));
  };

  return (
    <div className="mt-4 mb-2">
      <p className="text-base text-gray-800 dark:text-gray-200 mb-3">
        {INTRO_TEXT.slice(0, displayedChars)}
        {!textDone && <span className="inline-block w-0.5 h-4 bg-gray-800 dark:bg-gray-200 align-text-bottom animate-pulse" />}
      </p>
      {textDone && (
        <div className="flex gap-3 overflow-x-auto">
          {requirements.slice(0, visibleCards).map((req) => (
            <div
              key={req.requirement_number}
              className="relative shrink-0 animate-[fadeSlideIn_0.35s_ease-out_forwards]"
            >
              <div
                className="absolute top-8 left-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selected.has(req.requirement_number)}
                  onChange={() => toggleSelection(req.requirement_number)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
              </div>
              <SingleCard req={req} allRequirements={requirements} onShiftClick={() => toggleSelection(req.requirement_number)} />
            </div>
          ))}
        </div>
      )}
      {allCardsVisible && (
        <div className="flex gap-2 mt-3 animate-[fadeSlideIn_0.35s_ease-out_forwards]">
          <button
            onClick={handleApprove}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Approve ({selected.size})
          </button>
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm font-medium text-white bg-red-400 hover:bg-red-500 rounded-lg transition-colors"
          >
            Reject All
          </button>
        </div>
      )}
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
            onSend(text);
            setText("");
          }
        }}
      />
      <div className="flex items-center justify-between">
        <Button disabled={inProgress || !text.trim()} onClick={() => { onSend(text); setText(""); }}>Send</Button>
        {agent.isRunning && <StepProgress status="InProgress" state={agent.state} />}
      </div>
    </div>
  );
}

function ConjecturalRequirementsInner() {

  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedProject, selectProjectById, projects, isLoading: isLoadingProjects } = useProject();
  const {
    requirements,
    currentProjectId,
    isLoading,
    error,
    fetchRequirements,
    deleteRequirement,
    clearRequirements
  } = useRequirements();

  useCopilotReadable({
    description: "CurrentUser",
    value: user,
  }, [user]);

  useCopilotReadable({
    description: "CurrentProjectId",
    value: selectedProject?.id,
  }, [selectedProject?.id]);

  useCopilotReadable({
    description: "CurrentUserSettings",
    value: settings,
  }, [settings]);

  useLangGraphInterrupt({
    render: ({ event, resolve }) => {
        if (event.value === "hitl_brief_description") {
            return (
              <InterruptForm
                inputCount={settings.quantity_req_batch}
                onSubmit={resolve}
              />
            );
        }
        if (typeof event.value === "object" && event.value?.event === "hitl_req_approve") {
            const requirements: RequirementItem[] = event.value.requirements || [];
            return (
              <RequirementApprovalForm requirements={requirements} onResolve={resolve} />
            );
        }
        return <></>;
    }
}, [settings.quantity_req_batch]);

  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams.get('projectId');

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastProgress, setToastProgress] = useState(100);

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

  // Show loading when: actively fetching, project loading, or project selected but requirements not yet fetched
  const showLoading = isLoading || (!!projectIdFromQuery && !projectNotFound && (!selectedProject || currentProjectId !== selectedProject.id));

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

  // Reset page when search changes
  const prevSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchRef.current !== searchQuery) {
      setCurrentPage(1);
      prevSearchRef.current = searchQuery;
    }
  }, [searchQuery]);

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

  // Filter requirements: only Conjectural type + search query
  const activeRequirements = projectNotFound ? [] : requirements;
  const filteredRequirements = activeRequirements.filter(req => {
    const isConjectural = req.type === RequirementType.Conjectural;
    const matchesSearch = searchQuery
      ? req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requirement_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return isConjectural && matchesSearch;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRequirements.length / PAGE_SIZE));
  const paginatedRequirements = filteredRequirements.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleClear = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDelete = useCallback(async (requirementId: string) => {
    if (!confirm('Are you sure you want to delete this conjectural requirement?')) {
      return;
    }

    setSuccessMessage(null);

    const success = await deleteRequirement(requirementId);

    if (success) {
      setSuccessMessage('Conjectural requirement deleted successfully.');
    } else {
      alert('Failed to delete conjectural requirement');
    }
  }, [deleteRequirement]);

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

      <ConjecturalRequirementsToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onClear={handleClear}
      />

      <RequirementsTable
        requirements={paginatedRequirements}
        isLoading={showLoading}
        error={error}
        onDelete={handleDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

export default function ConjecturalRequirementsPage() {
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
      }}
      suggestions={[
        {
          title: "Generate conjectural requirements",
          message: "Generate conjectural requirements for the current project.",
        },
        {
          title: "Quantity conjectural requirements",
          message: "How many conjectural requirements are there in the current project?",
        },
      ]}>
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
