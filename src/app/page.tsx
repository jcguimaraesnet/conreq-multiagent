"use client";

import AppLayout from '@/components/layout/AppLayout';
import OnboardingCards from '@/components/home/OnboardingCards';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to CONREQ Multi-Agent!
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-2xl">
            A multi-agent AI team is available to help you specify software requirements under uncertainty.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-5">
            Try these things in sequence
          </h2>
          <OnboardingCards />
        </div>
      </div>
    </AppLayout>
  );
}
