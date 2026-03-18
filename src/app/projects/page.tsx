"use client";

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import { useOnborda } from 'onborda';
import AppLayout from '@/components/layout/AppLayout';
import PageTitle from '@/components/ui/PageTitle';
import ProjectsTable from '@/components/projects/ProjectsTable';
import ProjectsToolbar from '@/components/projects/ProjectsToolbar';
import AddProjectPopup from '@/components/projects/AddProjectPopup';
import ProjectDetailsModal from '@/components/projects/ProjectDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useRequirements } from '@/contexts/RequirementsContext';
import { Project, ProjectDetails } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api";
const PAGE_SIZE = 5;
const TOAST_DURATION_MS = 5000;
const DEFAULT_REQUIREMENT_COUNTS = {
  functional: 0,
  non_functional: 0,
  conjectural: 0,
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    }>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const { user } = useAuth();
  const { projects, isLoading, error: contextError, refreshProjects } = useProject();
  const { prefetchRequirements } = useRequirements();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startOnborda } = useOnborda();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPopup, setShowAddPopup] = useState(false);
  
  // Local state for operations
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastProgress, setToastProgress] = useState(100);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    const query = searchQuery.toLowerCase();
    return (
      project.title.toLowerCase().includes(query) || 
      (project.description?.toLowerCase().includes(query) ?? false) ||
      (project.project_id?.toLowerCase().includes(query) ?? false) ||
      (project.author_first_name?.toLowerCase().includes(query) ?? false) ||
      (project.author_last_name?.toLowerCase().includes(query) ?? false)
    );
  });

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Start tour when arriving via query string
  useEffect(() => {
    const tourParam = searchParams.get('tour');
    if (tourParam === 'projects') {
      const timer = setTimeout(() => startOnborda('projects-tour'), 400);
      return () => clearTimeout(timer);
    }
    if (tourParam === 'conjectural-nav') {
      const timer = setTimeout(() => startOnborda('conjectural-nav-tour'), 400);
      return () => clearTimeout(timer);
    }
  }, [searchParams, startOnborda]);

  // Count total projects for generating project ID
  const projectCount = projects.length;

  const handleClear = () => {
    setSearchQuery("");
  };
  const handleOpenAdd = () => setShowAddPopup(true);
  const handleCloseAdd = () => setShowAddPopup(false);
  
  const handleProjectCreated = useCallback(async () => {
    // Refresh projects from context
    await refreshProjects();
  }, [refreshProjects]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!user?.id) return;
    
    setIsDeleting(projectId);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete project');
      }
      
      // Refresh the projects list from context
      await refreshProjects();
      setSuccessMessage('Project deleted successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      setError(message);
      setSuccessMessage(null);
      console.error('Error deleting project:', err);
    } finally {
      setIsDeleting(null);
    }
  }, [user?.id, refreshProjects]);

  useEffect(() => {
    if (!successMessage) {
      setToastProgress(100);
      return;
    }

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

  const handleNavigateToRequirements = useCallback(async (projectId: string) => {
    // Find the project to get author info
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const projectAuthor = [project.author_first_name, project.author_last_name]
        .filter(Boolean)
        .join(' ') || project.author || 'Unknown';
      
      // Prefetch requirements before navigating
      await prefetchRequirements(projectId, projectAuthor);
    }
    
    router.push(`/requirements?projectId=${projectId}`);
    setIsDetailsOpen(false);
  }, [router, projects, prefetchRequirements]);

  const handleNavigateToConjecturalRequirements = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const projectAuthor = [project.author_first_name, project.author_last_name]
        .filter(Boolean)
        .join(' ') || project.author || 'Unknown';

      await prefetchRequirements(projectId, projectAuthor);
    }

    router.push(`/conjectural-requirements?projectId=${projectId}`);
    setIsDetailsOpen(false);
  }, [router, projects, prefetchRequirements]);

  const handleViewProject = useCallback(async (project: Project) => {
    if (!user?.id) return;

    const baseDetails: ProjectDetails = {
      ...project,
      requirement_counts: { ...DEFAULT_REQUIREMENT_COUNTS },
    };

    setSelectedProject(baseDetails);
    setIsDetailsOpen(true);
    setIsDetailsLoading(true);
    setDetailsError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/projects/${project.id}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to load project details');
      }

      const data = await response.json();
      setSelectedProject(prev => prev ? { ...prev, ...data } : data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project details';
      setDetailsError(message);
      console.error('Error loading project details:', err);
    } finally {
      setIsDetailsLoading(false);
    }
  }, [user?.id]);

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedProject(null);
    setDetailsError(null);
  };

  const handleDownloadDocument = useCallback(async (projectId: string, docType: 'vision' | 'requirements', filename?: string | null) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/projects/${projectId}/documents/${docType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${docType}-document.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download document';
      setError(message);
      console.error('Error downloading document:', err);
    }
  }, [user?.id]);

  const handleDownloadVision = useCallback((project: ProjectDetails) => {
    handleDownloadDocument(project.id, 'vision', project.vision_document_name);
  }, [handleDownloadDocument]);

  const handleDownloadRequirements = useCallback((project: ProjectDetails) => {
    handleDownloadDocument(project.id, 'requirements', project.requirements_document_name);
  }, [handleDownloadDocument]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Combine context error with local error
  const displayError = error || contextError;

  return (
    <AppLayout>
      <PageTitle title="Projects" />

      <ProjectsToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onClear={handleClear}
        onAdd={handleOpenAdd}
      />

      {displayError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {displayError}
        </div>
      )}

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

      <ProjectsTable 
        projects={paginatedProjects}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onDelete={handleDeleteProject}
        onView={handleViewProject}
        onNavigateToRequirements={handleNavigateToRequirements}
        onNavigateToConjecturalRequirements={handleNavigateToConjecturalRequirements}
        isLoading={isLoading}
        showEmptyState={!isLoading && projects.length === 0}
        isDeleting={isDeleting}
      />

      <AddProjectPopup
        open={showAddPopup}
        onClose={handleCloseAdd}
        onProjectCreated={handleProjectCreated}
        onGenerate={() => setTimeout(() => startOnborda('conjectural-nav-tour'), 400)}
        projectCount={projectCount}
      />

      <ProjectDetailsModal
        open={isDetailsOpen}
        project={selectedProject}
        countsLoading={isDetailsLoading}
        detailsError={detailsError}
        onClose={handleCloseDetails}
        onDownloadVision={handleDownloadVision}
        onDownloadRequirements={handleDownloadRequirements}
      />
    </AppLayout>
  );
}
