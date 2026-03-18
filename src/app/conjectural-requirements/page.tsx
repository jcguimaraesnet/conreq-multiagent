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
import StepProgress from '@/components/conjectural-requirements/StepProgress';
import InterruptFormPositiveImpactDescription from '@/components/conjectural-requirements/InterruptFormPositiveImpactDescription';
import InterruptFormEvaluation from '@/components/conjectural-requirements/InterruptFormEvaluation';
import type { RequirementItem } from '@/components/conjectural-requirements/InterruptFormEvaluation';
import Spinner from "@/components/ui/Spinner";
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import type { ConjecturalRequirement, ConjecturalEvaluation, ConjecturalStatus } from '@/types';
import { useOnborda } from 'onborda';
import { X, Maximize2 } from 'lucide-react';
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

const CARD_REVEAL_DELAY_MS = 300;

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
  const { agent } = useAgent({ agentId: "conreq-multiagent" });
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
  const { agent } = useAgent({ agentId: "conreq-multiagent" });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedProject, selectProjectById, projects, isLoading: isLoadingProjects } = useProject();
  const { startOnborda } = useOnborda();
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
    agentId: "conreq-multiagent",
    enabled: (event) => JSON.parse(event.value).type === 'hitl_brief_description',
    render: ({ event, resolve }) => {
      const quantity_req_batch = JSON.parse(event.value).quantity_req_batch || settings.quantity_req_batch;
      return (
              <InterruptFormPositiveImpactDescription
                inputCount={quantity_req_batch}
                onSubmit={resolve}
              />
      )
    }
  });

  useInterrupt({
    agentId: "conreq-multiagent",
    enabled: (event) => JSON.parse(event.value).type === "hitl_req_approve",
    render: ({ event, resolve }) => {
            const requirements: RequirementItem[] = JSON.parse(event.value).requirements || [];
            return (
              <InterruptFormEvaluation requirements={requirements} onResolve={resolve} />
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

  // Start chatbot-suggestion-tour when arriving via query string
  useEffect(() => {
    if (searchParams.get('tour') === 'chatbot-suggestion') {
      const timer = setTimeout(() => startOnborda('chatbot-suggestion-tour'), 800);
      return () => clearTimeout(timer);
    }
  }, [searchParams, startOnborda]);

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
  const fetchKanbanRequirements = useCallback(async (projectId: string, signal: AbortSignal) => {
    setKanbanLoading(true);
    setKanbanError(null);
    setKanbanRequirements([]);
    try {
      const res = await fetch(`${API_URL}/api/conjectural-requirements/project/${projectId}`, {
        headers: { Authorization: `Bearer ${user?.id || ""}` },
        signal,
      });
      if (!res.ok) throw new Error("Failed to fetch conjectural requirements");
      const data: ConjecturalRequirement[] = await res.json();
      if (!signal.aborted) {
        setKanbanRequirements(data);
      }
    } catch (err) {
      if (signal.aborted) return;
      setKanbanError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!signal.aborted) {
        setKanbanLoading(false);
      }
    }
  }, [API_URL, user?.id]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const controller = new AbortController();
    fetchKanbanRequirements(selectedProject.id, controller.signal);
    return () => controller.abort();
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
