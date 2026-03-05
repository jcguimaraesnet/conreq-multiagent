"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageTitle from '@/components/ui/PageTitle';
import RequirementsTable from '@/components/requirements/RequirementsTable';
import ConjecturalRequirementsToolbar from '@/components/conjectural-requirements/ConjecturalRequirementsToolbar';
import { useProject } from '@/contexts/ProjectContext';
import { useRequirements } from '@/contexts/RequirementsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable, useLangGraphInterrupt, useCoAgent } from "@copilotkit/react-core";
import { useAgent } from "@copilotkit/react-core/v2";
import ResourceCanvas from '@/components/conjectural-requirements/ResourceCanvas';
import StepProgress from '@/components/requirements/StepProgress';
import InterruptForm from '@/components/requirements/InterruptForm';
import Spinner from "@/components/ui/Spinner";
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { RequirementType } from '@/types';

const PAGE_SIZE = 10;
const TOAST_DURATION_MS = 5000;

interface AgentState {
  run_id: string;
  user_id: string;
  project_id: string;
  require_brief_description: boolean;
  batch_mode: boolean;
  quantity_req_batch: number;
  canvas_resources: string[];
  step1_elicitation: boolean;
  step2_analysis: boolean;
  step3_specification: boolean;
  step4_validation: boolean;
  pending_progress: boolean;
}

function CustomInput({ inProgress, onSend }: { inProgress: boolean; onSend: (text: string) => void }) {
  const { agent } = useAgent({ agentId: "sample_agent" });
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
  const { state } = useCoAgent<AgentState>({
    name: "sample_agent",
    initialState: {
      canvas_resources: [],
    } as AgentState,
  });

  const canvasResources: string[] = state.canvas_resources || [];

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
      render: ({ event, resolve }) => (
          <InterruptForm
            inputCount={settings.quantity_req_batch}
            onSubmit={resolve}
          />
      )
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

      <ResourceCanvas resources={canvasResources} />
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
