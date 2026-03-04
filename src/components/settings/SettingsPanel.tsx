"use client";

import { ChevronUp, ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import { useSettings } from '@/contexts/SettingsContext';

export default function SettingsPanel() {
  const { settings, isLoading, updateSetting } = useSettings();

  const incrementQuantity = () => {
    const newValue = Math.min(settings.quantity_req_batch + 1, 10);
    updateSetting('quantity_req_batch', newValue);
  };

  const decrementQuantity = () => {
    const newValue = Math.max(settings.quantity_req_batch - 1, 2);
    updateSetting('quantity_req_batch', newValue);
  };

  if (isLoading) {
    return (
      <Card noPadding>
        {/* Skeleton: Setting 1 */}
        <div className="px-6 py-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                A brief description of the business need or desired positive impact
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When enabled, a description must be provided before generating requirements
              </p>
            </div>
            {/* Toggle Skeleton */}
            <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Setting 2 */}
        <div className="px-6 py-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Generation mode
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose between batch or single requirement generation
              </p>
            </div>
            {/* Button Group Skeleton */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
              <div className="w-14 h-[34px] bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              <div className="w-[72px] h-[34px] bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton: Setting 3 */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Quantity of requirements for batch generation
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of requirements to generate in batch mode (between 2 and 10)
              </p>
            </div>
            {/* Number Stepper Skeleton */}
            <div className="flex items-center border border-border-light dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="px-4 py-2 min-w-[50px] h-9 bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex flex-col border-l border-border-light dark:border-gray-600">
                <div className="px-2 py-1 h-[18px] bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="px-2 py-1 h-[18px] bg-gray-200 dark:bg-gray-700 animate-pulse border-t border-border-light dark:border-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding>
      
      {/* Setting 1: Require Description */}
      <div id="setting-require-description" className="px-6 py-5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Require brief description to generate requirement
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              When enabled, a description must be provided before generating requirements
            </p>
          </div>
          <Toggle
            checked={settings.require_brief_description}
            onChange={(value) => updateSetting('require_brief_description', value)}
          />
        </div>
      </div>

      {/* Setting 2: Generation Mode */}
      <div id="setting-generation-mode" className="px-6 py-5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Generation mode
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Choose between batch or single requirement generation
            </p>
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => updateSetting('batch_mode', true)}
              className={`px-3 py-2.5 text-xs font-medium rounded-md transition-colors ${
                settings.batch_mode
                  ? 'bg-primary text-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Batch
            </button>
            <button
              onClick={() => updateSetting('batch_mode', false)}
              className={`px-3 py-2.5 text-xs font-medium rounded-md transition-colors ${
                !settings.batch_mode
                  ? 'bg-primary text-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Single
            </button>
          </div>
        </div>
      </div>

      {/* Setting 3: Batch Quantity */}
      <div id="setting-batch-quantity" className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Quantity of requirements for batch generation
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of requirements to generate in batch mode (between 2 and 10)
            </p>
          </div>
          <div className="flex items-center">
            <div className={`flex items-center border rounded-lg overflow-hidden transition-opacity ${
              settings.batch_mode 
                ? 'border-border-light dark:border-gray-600' 
                : 'border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed'
            }`}>
              <div className={`px-4 py-2 text-sm font-medium min-w-[50px] text-center ${
                settings.batch_mode
                  ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
              }`}>
                {settings.batch_mode ? settings.quantity_req_batch : '—'}
              </div>
              <div className="flex flex-col border-l border-border-light dark:border-gray-600">
                <button
                  onClick={incrementQuantity}
                  disabled={!settings.batch_mode}
                  className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={decrementQuantity}
                  disabled={!settings.batch_mode}
                  className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-border-light dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </Card>
  );
}
