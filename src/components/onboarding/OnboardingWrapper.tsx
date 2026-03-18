"use client";

import { useMemo } from 'react';
import { OnbordaProvider, Onborda } from 'onborda';
import { usePathname } from 'next/navigation';
import { getOnboardingTours } from '@/constants/onboarding-steps';
import { useProject } from '@/contexts/ProjectContext';
import TourCard from './TourCard';

export default function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { projects } = useProject();
  const pathname = usePathname();

  const steps = useMemo(() => {
    return getOnboardingTours(projects.length > 0);
  }, [projects.length > 0]);

  return (
    <OnbordaProvider key={pathname}>
      <Onborda
        steps={steps}
        showOnborda={true}
        shadowRgb="0,0,0"
        shadowOpacity="0.8"
        cardComponent={TourCard}
      >
        {children}
      </Onborda>
    </OnbordaProvider>
  );
}
