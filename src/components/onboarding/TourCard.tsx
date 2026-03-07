"use client";

import type { CardComponentProps } from 'onborda';
import { useOnborda } from 'onborda';
import { useRouter } from 'next/navigation';
import { useOnboardingStatus, type OnboardingStage } from '@/hooks/useOnboardingStatus';

const NEXT_ROUTE_MAP: Record<string, string> = {
  'settings-tour': '/projects',
};

const TOUR_STAGE_MAP: Record<string, OnboardingStage> = {
  'home-tour': 'stage1',
  'settings-tour': 'stage2',
  'projects-tour': 'stage3',
};

export default function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { currentTour, closeOnborda } = useOnborda();
  const { completeStage } = useOnboardingStatus();
  const router = useRouter();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isLastStepOfFinalTour =
    currentTour === 'projects-tour' && isLastStep;
  const isLastStepOfIntermediateTour =
    isLastStep && currentTour !== 'projects-tour';

  const completeCurrentStage = () => {
    if (currentTour) {
      const stage = TOUR_STAGE_MAP[currentTour];
      if (stage) completeStage(stage);
    }
  };

  const handleNext = () => {
    if (isLastStepOfFinalTour) {
      completeCurrentStage();
      closeOnborda();
    } else if (isLastStepOfIntermediateTour) {
      completeCurrentStage();
      closeOnborda();

      if (currentTour === 'home-tour') {
        // Open settings modal by clicking the gear icon
        const settingsBtn = document.querySelector('#header-settings') as HTMLButtonElement;
        if (settingsBtn) settingsBtn.click();
      } else {
        const nextRoute = currentTour ? NEXT_ROUTE_MAP[currentTour] : null;
        if (nextRoute) router.push(nextRoute);
      }
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    completeCurrentStage();
    closeOnborda();
  };

  const BUTTON_LABEL_MAP: Record<string, string> = {
    'home-tour': 'Open Settings',
    'settings-tour': 'Go to Projects',
  };

  const getNextButtonLabel = () => {
    if (isLastStepOfFinalTour) return 'Close';
    if (isLastStepOfIntermediateTour && currentTour) {
      return BUTTON_LABEL_MAP[currentTour] ?? 'Close';
    }
    return 'Next';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[340px] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-primary">
            {step.icon}
          </div>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-2">
          {step.title}
        </h3>
      </div>

      {/* Content */}
      <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {step.content}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          {!isLastStepOfFinalTour && !(isLastStepOfIntermediateTour && totalSteps > 1) && (
            <button
              onClick={handleSkip}
              className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Skip tour
            </button>
          )}
          {!isFirstStep && (
            <button
              onClick={prevStep}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Previous
            </button>
          )}
        </div>
        <button
          onClick={handleNext}
          className="px-5 py-2 text-sm font-semibold bg-primary text-white dark:text-black rounded-lg hover:bg-primary/90 transition-colors"
        >
          {getNextButtonLabel()}
        </button>
      </div>

      {/* Arrow */}
      {arrow}
    </div>
  );
}
