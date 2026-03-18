"use client";

import { useRouter } from 'next/navigation';
import { useOnborda } from 'onborda';
import { Settings, FolderKanban, Sparkles, Star, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHasConjecturalRequirements } from '@/hooks/useHasConjecturalRequirements';

interface CardConfig {
  step: number;
  icon: React.ReactNode;
  skeletonLabel: string;
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  heroDecorations: React.ReactNode;
}

const CIRCLE_RADIUS = 16;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function StepCircle({ step, completed }: { step: number; completed?: boolean }) {
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
      <svg width="40" height="40" className="absolute inset-0">
        {/* Dashed orange base circle */}
        <circle
          cx="20"
          cy="20"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="rgba(242, 138, 74, 0.4)"
          strokeWidth="3"
          strokeDasharray="4 4"
          className={completed ? 'animate-[fadeOut_0.1s_ease-out_1.1s_forwards]' : ''}
        />
        {/* Animated green overlay circle */}
        {completed && (
          <circle
            cx="20"
            cy="20"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="rgba(34, 197, 94, 0.7)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={CIRCLE_CIRCUMFERENCE}
            transform="rotate(-90 20 20)"
            className="animate-[circleDraw_0.8s_ease-out_0.3s_forwards]"
          />
        )}
      </svg>
      {/* Number → fades out when completed, Check → fades in */}
      <span
        className={`absolute text-sm font-bold ${completed ? 'animate-[fadeOut_0.3s_ease-in_0.8s_forwards]' : ''}`}
        style={{ color: '#F28A4A' }}
      >
        {step}
      </span>
      {completed && (
        <Check
          className="absolute w-5 h-5 text-green-600 dark:text-green-400 opacity-0 animate-[fadeIn_0.3s_ease-in_1.1s_forwards]"
        />
      )}
    </div>
  );
}

function SettingsDecorations() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
      {/* Toggle switches */}
      <rect x="30" y="30" width="40" height="20" rx="10" fill="currentColor" />
      <circle cx="60" cy="40" r="8" fill="currentColor" />
      <rect x="30" y="65" width="40" height="20" rx="10" fill="currentColor" />
      <circle cx="40" cy="75" r="8" fill="currentColor" />
      {/* Slider */}
      <rect x="100" y="40" width="80" height="4" rx="2" fill="currentColor" />
      <circle cx="150" cy="42" r="7" fill="currentColor" />
      {/* Checkbox */}
      <rect x="110" y="70" width="16" height="16" rx="3" fill="currentColor" />
      <rect x="135" y="74" width="50" height="8" rx="2" fill="currentColor" />
      {/* Gear */}
      <circle cx="220" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="220" cy="50" r="7" fill="currentColor" />
      {/* Dots */}
      <rect x="200" y="85" width="60" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

function ProjectDecorations() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
      {/* Kanban columns */}
      <rect x="20" y="25" width="55" height="90" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="25" y="40" width="45" height="12" rx="2" fill="currentColor" />
      <rect x="25" y="57" width="45" height="12" rx="2" fill="currentColor" />
      <rect x="25" y="74" width="45" height="12" rx="2" fill="currentColor" />

      <rect x="85" y="25" width="55" height="90" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="90" y="40" width="45" height="12" rx="2" fill="currentColor" />
      <rect x="90" y="57" width="45" height="12" rx="2" fill="currentColor" />

      <rect x="150" y="25" width="55" height="90" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="155" y="40" width="45" height="12" rx="2" fill="currentColor" />

      {/* Gantt bars */}
      <rect x="220" y="30" width="50" height="8" rx="2" fill="currentColor" />
      <rect x="230" y="48" width="40" height="8" rx="2" fill="currentColor" />
      <rect x="215" y="66" width="60" height="8" rx="2" fill="currentColor" />
      <rect x="240" y="84" width="35" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

function ConjecturalDecorations() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
      {/* Grid lines */}
      {[30, 55, 80, 105].map((y) => (
        <line key={`h-${y}`} x1="15" y1={y} x2="285" y2={y} stroke="currentColor" strokeWidth="1" />
      ))}
      {[40, 90, 140, 190, 240].map((x) => (
        <line key={`v-${x}`} x1={x} y1="20" x2={x} y2="120" stroke="currentColor" strokeWidth="1" />
      ))}
      {/* Data cells */}
      <rect x="42" y="32" width="46" height="21" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="92" y="57" width="46" height="21" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="142" y="32" width="46" height="21" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="192" y="82" width="46" height="21" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="42" y="82" width="46" height="21" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="142" y="57" width="46" height="21" rx="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

const CARDS: CardConfig[] = [
  {
    step: 1,
    icon: <Settings className="w-5 h-5" />,
    skeletonLabel: 'Settings',
    badge: '5 Min · Technical',
    title: 'Set up your settings',
    description: 'Configure your preferences to personalize how conjectural requirements are generated and evaluated.',
    ctaLabel: 'Settings',
    heroDecorations: <SettingsDecorations />,
  },
  {
    step: 2,
    icon: <FolderKanban className="w-5 h-5" />,
    skeletonLabel: 'Project',
    badge: '10 Min · Non Technical',
    title: 'Create your first project',
    description: 'Set up a project to organize and manage your conjectural requirements in one place.',
    ctaLabel: 'Create',
    heroDecorations: <ProjectDecorations />,
  },
  {
    step: 3,
    icon: <Sparkles className="w-5 h-5" />,
    skeletonLabel: 'Conjectural Requirement',
    badge: '5 Min · Non Technical',
    title: 'Create your first requirement',
    description: 'Generate your first conjectural software requirement with AI-assisted guidance, safety, and precision.',
    ctaLabel: 'Generate',
    heroDecorations: <ConjecturalDecorations />,
  },
];

export default function OnboardingCards() {
  const router = useRouter();
  const { startOnborda } = useOnborda();
  const { hasSavedSettings } = useSettings();
  const { projects } = useProject();
  const { user } = useAuth();
  const hasOwnProjects = projects.some(p => p.user_id === user?.id);
  const hasConjectural = useHasConjecturalRequirements();

  const handleCta = (step: number) => {
    switch (step) {
      case 1:
        if (hasSavedSettings) {
          const settingsBtn = document.querySelector('#header-settings') as HTMLButtonElement;
          if (settingsBtn) settingsBtn.click();
        } else {
          startOnborda('settings-tour');
        }
        break;
      case 2:
        if (hasOwnProjects) {
          router.push('/projects');
        } else {
          startOnborda('sidebar-projects-tour');
        }
        break;
      case 3:
        if (hasConjectural) {
          router.push('/projects');
        } else {
          router.push('/projects?tour=conjectural-nav');
        }
        break;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {CARDS.map((card) => (
        <div
          key={card.step}
          className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
        >
          {/* Hero area */}
          <div className="relative h-40 overflow-hidden bg-linear-to-br from-indigo-50 via-white to-orange-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 text-gray-400 dark:text-gray-500">
            {card.heroDecorations}
            {/* Icon + skeleton label */}
            <div className="relative p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {card.icon}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-gray-600" />
                <span style={{ fontSize: 19, fontWeight: 700 }} className="text-gray-800 dark:text-gray-200">{card.skeletonLabel}</span>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-col flex-1 p-5">
            {/* Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3" />
                {card.badge}
              </span>
            </div>

            {/* Title */}
            <h3 style={{ fontSize: 19, fontWeight: 700 }} className="text-gray-900 dark:text-white mb-2">
              {card.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-1">
              {card.description}
            </p>

            {/* Footer: step circle + CTA */}
            <div className="flex items-center justify-between">
              <StepCircle step={card.step} completed={(card.step === 1 && hasSavedSettings) || (card.step === 2 && hasOwnProjects) || (card.step === 3 && hasConjectural)} />
              <Button size="md" className="rounded-md" onClick={() => handleCta(card.step)}>
                {card.ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
