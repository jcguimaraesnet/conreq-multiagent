"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageTitle from '@/components/ui/PageTitle';
import RequirementsTable from '@/components/requirements/RequirementsTable';
import RequirementsToolbar from '@/components/requirements/RequirementsToolbar';
import { useProject } from '@/contexts/ProjectContext';
import { useRequirements } from '@/contexts/RequirementsContext';
import Spinner from "@/components/ui/Spinner";

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
  progress_message: string;
}

function RequirementsInner() {

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

  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams.get('projectId');

  const [filterType, setFilterType] = useState<string>("");
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

  // Reset page when filters change
  const prevFiltersRef = useRef({ filterType, searchQuery });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.filterType !== filterType || prev.searchQuery !== searchQuery) {
      setCurrentPage(1);
      prevFiltersRef.current = { filterType, searchQuery };
    }
  }, [filterType, searchQuery]);

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

  // Filter requirements by type and search query (client-side)
  // Use empty array when project is not found to avoid showing stale data
  const activeRequirements = projectNotFound ? [] : requirements;
  const filteredRequirements = activeRequirements.filter(req => {
    const matchesType = filterType ? req.type === filterType : true;
    const matchesSearch = searchQuery
      ? req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requirement_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRequirements.length / PAGE_SIZE));
  const paginatedRequirements = filteredRequirements.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleClear = () => {
    setFilterType("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDelete = useCallback(async (requirementId: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) {
      return;
    }

    setSuccessMessage(null);

    const success = await deleteRequirement(requirementId);

    if (success) {
      setSuccessMessage('Requirement deleted successfully.');
    } else {
      alert('Failed to delete requirement');
    }
  }, [deleteRequirement]);

  return (
    <>
      <PageTitle title="Requirements" backHref="/projects" backLabel="Back Projects" />
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
            Project not found. Select a valid project to view its requirements.
          </p>
        </div>
      )}

      <RequirementsToolbar
        filterType={filterType}
        setFilterType={setFilterType}
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

export default function RequirementsPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      }>
        <RequirementsInner />
      </Suspense>
    </AppLayout>
  );
}
