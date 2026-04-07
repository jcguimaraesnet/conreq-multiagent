import { Eye, ListChecks, Bot, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Project } from '@/types';
import Card from '@/components/ui/Card';

interface ProjectsTableProps {
  projects: Project[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDelete?: (projectId: string) => void;
  onView?: (project: Project) => void;
  onNavigateToRequirements?: (projectId: string) => void;
  onNavigateToConjecturalRequirements?: (projectId: string) => void;
  isLoading?: boolean;
  showEmptyState?: boolean; // Only show "No projects" when explicitly true
  isDeleting?: string | null;
}

export default function ProjectsTable({ 
  projects, 
  currentPage, 
  totalPages, 
  onPageChange,
  onDelete,
  onView,
  onNavigateToRequirements,
  onNavigateToConjecturalRequirements,
  isLoading = false,
  showEmptyState = false,
  isDeleting = null
}: ProjectsTableProps) {
  const handleDelete = (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.title}"? This will also delete all associated requirements.`)) {
      onDelete?.(project.id);
    }
  };

  const getAuthorName = (project: Project) => {
    const first = project.author_first_name?.trim();
    const last = project.author_last_name?.trim();
    if (first || last) {
      return [first, last].filter(Boolean).join(' ');
    }
    return 'Unknown author';
  };

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
            i === currentPage
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <Card noPadding className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700 text-white dark:bg-gray-800/80">
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider w-24 text-center">ID</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider w-1/2">Title</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider">Author</th>
              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Created At</th>
              <th id="table-actions-header" className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading projects...</span>
                  </div>
                </td>
              </tr>
            ) : projects.length > 0 ? (
              projects.map((project, index) => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400 text-center align-middle">
                    {project.project_id || '-'}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="font-medium text-gray-900 dark:text-white">{project.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {project.description
                        ? project.description.length > 50
                          ? `${project.description.slice(0, 50)}...`
                          : project.description
                        : 'No description'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 align-middle">
                    {getAuthorName(project)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 align-middle">
                    {project.created_at 
                      ? new Date(project.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        title="View Project"
                        onClick={() => onView?.(project)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button 
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Project"
                        onClick={() => handleDelete(project)}
                        disabled={isDeleting === project.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        id={index === 0 ? 'btn-go-to-requirements-first' : undefined}
                        className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        title="Go to Requirements"
                        onClick={() => onNavigateToRequirements?.(project.id)}
                      >
                        <ListChecks className="w-4 h-4" />
                      </button>

                      <button
                        id={index === 0 ? 'btn-go-to-conjectural-first' : undefined}
                        data-project-id={project.id}
                        className="p-1.5 text-orange-500 hover:text-orange-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        title="Go to Conjectural Requirements"
                        onClick={() => onNavigateToConjecturalRequirements?.(project.id)}
                      >
                        <Bot className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : showEmptyState ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No projects found. Create a new project to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="flex items-center justify-center p-3 border-t border-border-light dark:border-border-dark bg-white dark:bg-surface-dark">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-2 mr-2 border border-border-light dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          {renderPageNumbers()}
          <button 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-2 ml-2 border border-border-light dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
