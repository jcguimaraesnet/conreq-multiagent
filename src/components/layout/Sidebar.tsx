"use client";

import { LayoutDashboard, Bot, ChevronDown, FolderKanban, BotMessageSquare, BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AI_MODELS } from '@/constants';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const activeClass = "flex items-center gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-900/10 text-gray-900 dark:text-orange-100 rounded-lg border-l-4 border-primary transition-colors";
  const inactiveClass = "flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group";

  return (
    <aside className="w-64 bg-surface-light dark:bg-surface-dark flex flex-col border-r border-border-light dark:border-border-dark flex-shrink-0 transition-colors duration-200">
      <div className="h-16 flex items-center px-6 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black"><BotMessageSquare className="w-5 h-5" /></div>
          <span className="font-bold text-1xl tracking-tight text-gray-900 dark:text-white">CONREQ Multi-Agent</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
        <Link className={isActive('/') ? activeClass : inactiveClass} href="/">
          <LayoutDashboard className={isActive('/') ? "w-5 h-5 text-primary dark:text-orange-400" : "w-5 h-5 group-hover:text-primary transition-colors"} />
          <span className="font-medium">Home</span>
        </Link>
        <Link id="sidebar-projects" className={isActive('/projects') ? activeClass : inactiveClass} href="/projects">
          <FolderKanban className={isActive('/projects') ? "w-5 h-5 text-primary dark:text-orange-400" : "w-5 h-5 group-hover:text-primary transition-colors"} />
          <span className="font-medium">Projects</span>
        </Link>
        <Link className={isActive('/dashboard') ? activeClass : inactiveClass} href="/dashboard">
          <BarChart3 className={isActive('/dashboard') ? "w-5 h-5 text-primary dark:text-orange-400" : "w-5 h-5 group-hover:text-primary transition-colors"} />
          <span className="font-medium">Dashboard</span>
        </Link>
      </nav>

      {pathname === '/requirements' && (
        <div className="border-t border-border-light dark:border-border-dark">
          <div className="px-4 pt-4 pb-4">
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Model Configuration</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <Bot className="w-4 h-4" />
              </span>
              <select className="block w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-gray-900 dark:text-gray-200 appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors outline-none">
                {AI_MODELS.map(model => (
                  <option key={model}>{model}</option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                <ChevronDown className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
