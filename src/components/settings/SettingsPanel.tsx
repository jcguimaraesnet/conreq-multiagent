"use client";

import { ChevronUp, ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import { useSettings } from '@/contexts/SettingsContext';

export default function SettingsPanel() {
  const { settings, isLoading, updateSetting, updateSettings } = useSettings();

  const isHumanInTheLoopEnabled = settings.require_brief_description || settings.require_evaluation;

  const handleHumanInTheLoopToggle = (value: boolean) => {
    updateSettings({
      require_brief_description: value,
      require_evaluation: value,
    });
  };

  const incrementQuantity = () => {
    const newValue = Math.min(settings.quantity_req_batch + 1, 5);
    updateSetting('quantity_req_batch', newValue);
  };

  const decrementQuantity = () => {
    const newValue = Math.max(settings.quantity_req_batch - 1, 2);
    updateSetting('quantity_req_batch', newValue);
  };

  const incrementMaxAttempts = () => {
    const newValue = Math.min(settings.spec_attempts + 1, 3);
    updateSetting('spec_attempts', newValue);
  };

  const decrementMaxAttempts = () => {
    const newValue = Math.max(settings.spec_attempts - 1, 1);
    updateSetting('spec_attempts', newValue);
  };

  if (isLoading) {
    return (
      <Card noPadding>
        {/* Skeleton: Setting 1 - Model */}
        <div className="px-6 py-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                LLM configuration
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select the AI model family used for conjectural requirement generation
              </p>
            </div>
            {/* Select Skeleton */}
            <div className="w-36 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Master Human-in-the-Loop */}
        <div className="px-6 py-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Human-in-the-Loop on conjectural requirement specification process
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When enabled, human intervention will be required during the process.
              </p>
            </div>
            {/* Toggle Skeleton */}
            <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Sub-setting 1 */}
        <div className="pl-16 pr-6 py-3 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Human-in-the-Loop for a brief description of the business need
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                When enabled, a description must be provided before generating requirements
              </p>
            </div>
            {/* Small Toggle Skeleton */}
            <div className="h-5 w-9 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Sub-setting 2 */}
        <div className="pl-16 pr-6 py-3 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Human-in-the-Loop for evaluating conjectural requirements
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                When enabled, conjectural requirements must be evaluated by the user before proceeding.
              </p>
            </div>
            {/* Small Toggle Skeleton */}
            <div className="h-5 w-9 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Skeleton: Setting 3 */}
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

        {/* Skeleton: Sub-setting - Batch Quantity */}
        <div className="pl-16 pr-6 py-3 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Quantity of requirements per batch
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                Number of requirements to generate in batch mode (between 2 and 5)
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

        {/* Skeleton: Setting 5 - Specification Attempts */}
        <div className="px-6 py-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Specification attempts
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of attempts to generate conjectural requirements (between 1 and 3)
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

        {/* Skeleton: Sub-setting - Model Judge */}
        <div className="pl-16 pr-6 py-3 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                LLM-as-Judge configuration
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                Select the AI model used for automated quality evaluation of conjectural requirements
              </p>
            </div>
            {/* Select Skeleton */}
            <div className="w-36 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>

      </Card>
    );
  }

  return (
    <Card noPadding>

      {/* Setting 1: Model */}
      <div id="setting-model" className="px-6 py-5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              LLM configuration
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select the AI model family used for conjectural requirement generation
            </p>
          </div>
          <select
            value={settings.model}
            onChange={(e) => updateSetting('model', e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-border-light dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="gemini">Gemini 3 Family</option>
            <option value="gpt">GPT 5 Family</option>
            <option value="gpt_azure">GPT 5 Family (Azure)</option>
            <option value="llama_azure">Llama 70B (Azure)</option>
            <option value="model_local">Local (Ollama/Qwen 14B)</option>
          </select>
        </div>
      </div>

      {/* Master: Human-in-the-Loop */}
      <div id="setting-human-in-the-loop" className="px-6 py-5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              <span className="font-semibold text-primary">Human-in-the-Loop</span> on conjectural requirement specification process
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              When enabled, human intervention will be required during the process.
            </p>
          </div>
          <Toggle
            checked={isHumanInTheLoopEnabled}
            onChange={handleHumanInTheLoopToggle}
          />
        </div>
      </div>

      {/* Sub-setting 1: Require Description */}
      <div id="setting-require-description" className="pl-16 pr-6 py-3 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-primary">Human-in-the-Loop</span> for a brief description of the business need
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              When enabled, a description must be provided before generating requirements
            </p>
          </div>
          <Toggle
            size="sm"
            checked={settings.require_brief_description}
            onChange={(value) => updateSetting('require_brief_description', value)}
          />
        </div>
      </div>

      {/* Sub-setting 2: Require Evaluation */}
      <div id="setting-require-evaluation" className="pl-16 pr-6 py-3 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-primary">Human-in-the-Loop</span> for evaluating conjectural requirements
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              When enabled, conjectural requirements must be evaluated by the user before proceeding.
            </p>
          </div>
          <Toggle
            size="sm"
            checked={settings.require_evaluation}
            onChange={(value) => updateSetting('require_evaluation', value)}
          />
        </div>
      </div>

      {/* Setting 3: Generation Mode */}
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

      {/* Sub-setting: Batch Quantity */}
      <div id="setting-batch-quantity" className="pl-16 pr-6 py-3 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Quantity of requirements per batch
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Number of requirements to generate in batch mode (between 2 and 5)
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

      {/* Setting 5: Specification Attempts */}
      <div id="setting-spec-attempts" className="px-6 py-5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Specification attempts
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of attempts to generate conjectural requirements (between 1 and 3)
            </p>
          </div>
          <div className="flex items-center">
            <div className="flex items-center border rounded-lg overflow-hidden border-border-light dark:border-gray-600">
              <div className="px-4 py-2 text-sm font-medium min-w-[50px] text-center bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                {settings.spec_attempts}
              </div>
              <div className="flex flex-col border-l border-border-light dark:border-gray-600">
                <button
                  onClick={incrementMaxAttempts}
                  className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronUp className="w-4 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={decrementMaxAttempts}
                  className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-border-light dark:border-gray-600"
                >
                  <ChevronDown className="w-4 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-setting: Model Judge */}
      <div id="setting-model-judge" className="pl-16 pr-6 py-3 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              LLM-as-Judge configuration
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Select the AI model used for automated quality evaluation of conjectural requirements
            </p>
          </div>
          <select
            value={settings.model_judge}
            onChange={(e) => updateSetting('model_judge', e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-border-light dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="gemini">Gemini 3.1 Pro</option>
            <option value="gpt_azure">GPT 5.4 Pro (Azure)</option>
          </select>
        </div>
      </div>

    </Card>
  );
}
