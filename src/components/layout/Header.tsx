"use client";

import { useState, useRef, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Folder, ChevronDown, Moon, Sun, LogOut, Settings } from 'lucide-react';
import { useOnborda } from 'onborda';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import SettingsModal from '@/components/settings/SettingsModal';

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams.get('projectId');
  const isRequirementsPage = pathname === '/requirements' || pathname === '/conjectural-requirements';
  const { isDarkMode, toggleTheme, mounted } = useTheme();
  const { user } = useAuth();
  const { selectedProject, isLoading: isLoadingProjects } = useProject();
  const { startOnborda } = useOnborda();
  const { stageCompleted } = useOnboardingStatus();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Start settings-tour when modal opens and stage2 onboarding is pending
  useEffect(() => {
    if (isSettingsOpen && !stageCompleted.stage2) {
      const timer = setTimeout(() => startOnborda('settings-tour'), 500);
      return () => clearTimeout(timer);
    }
  }, [isSettingsOpen, stageCompleted.stage2, startOnborda]);

  // Only show project label if we have a projectId in URL and the project is loaded
  const hasValidProject = isRequirementsPage && projectIdFromQuery && selectedProject;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    // Use form action for server-side signout
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/signout';
    document.body.appendChild(form);
    form.submit();
  };

  // Get first name from user_metadata
  const firstName = user?.user_metadata?.first_name || null;
  
  // Get last name from user_metadata
  const lastName = user?.user_metadata?.last_name || null;

  // Get user initials
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return '';
  };

  // Get display name
  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return '';
  };

  return (
    <>
    <header className="h-16 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-8 flex-shrink-0 transition-colors duration-200">
      <div className="w-64 sm:w-96">
        {hasValidProject ? (
          <div className="flex items-center gap-3 py-2">
            <Folder className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedProject.project_id ? `${selectedProject.project_id} - ${selectedProject.title}` : selectedProject.title}
            </span>
          </div>
        ) : isRequirementsPage && projectIdFromQuery && isLoadingProjects ? (
          <div className="flex items-center gap-3 py-2">
            <Folder className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading project...</span>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Sun className="w-5 h-5 hidden dark:block" />
          <Moon className="w-5 h-5 block dark:hidden" />
        </button>

        <button
          id="header-settings"
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="relative" ref={profileMenuRef}>
          <div 
            className="flex items-center gap-3 pl-4 border-l border-border-light dark:border-border-dark cursor-pointer group"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="text-right hidden sm:block min-w-[100px]">
              <p 
                className="text-sm font-semibold text-gray-900 dark:text-white leading-none"
                suppressHydrationWarning
              >
                {getDisplayName()}
              </p>
            </div>
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm bg-primary flex items-center justify-center text-white dark:text-black font-semibold text-sm"
                suppressHydrationWarning
              >
                {getInitials()}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg border border-border-light dark:border-border-dark py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
