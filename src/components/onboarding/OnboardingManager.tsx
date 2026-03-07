"use client";

import { useEffect, useRef } from 'react';
import { useOnborda } from 'onborda';
import { usePathname } from 'next/navigation';
import type { OnboardingStage } from '@/hooks/useOnboardingStatus';
import { useAuth } from '@/contexts/AuthContext';

const TOUR_MAP: Record<string, { tour: string; stage: OnboardingStage }> = {
  '/': { tour: 'home-tour', stage: 'stage1' },
  '/projects': { tour: 'projects-tour', stage: 'stage3' },
};

const FIRST_SELECTOR: Record<string, string> = {
  'home-tour': '#header-settings',
  'projects-tour': '#btn-add-project',
};

interface OnboardingManagerProps {
  stageCompleted: Record<OnboardingStage, boolean>;
  isOnboardingLoading: boolean;
}

export default function OnboardingManager({ stageCompleted, isOnboardingLoading }: OnboardingManagerProps) {
  const { startOnborda } = useOnborda();
  const { user, isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const startOnbordaRef = useRef(startOnborda);
  startOnbordaRef.current = startOnborda;

  useEffect(() => {
    if (isAuthLoading || isOnboardingLoading || !user) return;

    const entry = TOUR_MAP[pathname];
    if (!entry) return;

    if (stageCompleted[entry.stage]) return;

    const selector = FIRST_SELECTOR[entry.tour];

    // If element already exists, start after a short delay
    if (!selector || document.querySelector(selector)) {
      const timer = setTimeout(() => startOnbordaRef.current(entry.tour), 500);
      return () => clearTimeout(timer);
    }

    // Otherwise, observe DOM until the element appears
    let disconnected = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        disconnected = true;
        setTimeout(() => startOnbordaRef.current(entry.tour), 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Safety: stop observing after 10 seconds
    const safety = setTimeout(() => {
      if (!disconnected) observer.disconnect();
    }, 10_000);

    return () => {
      observer.disconnect();
      clearTimeout(safety);
    };
  }, [pathname, stageCompleted, isAuthLoading, isOnboardingLoading, user]);

  return null;
}
