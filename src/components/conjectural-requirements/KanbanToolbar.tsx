"use client";

import Toolbar from "@/components/ui/Toolbar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export type DisplayField = "desired_behavior" | "positive_impact" | "uncertainty";

const FIELD_LABELS: Record<DisplayField, string> = {
  desired_behavior: "Desired Behavior",
  positive_impact: "Positive Impact",
  uncertainty: "Uncertainty",
};

const FIELD_CYCLE: DisplayField[] = ["desired_behavior", "positive_impact", "uncertainty"];

interface KanbanToolbarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  displayField: DisplayField;
  onToggleField: (field: DisplayField) => void;
  onClear: () => void;
}

export default function KanbanToolbar({
  searchQuery,
  setSearchQuery,
  displayField,
  onToggleField,
  onClear,
}: KanbanToolbarProps) {
  const handleCycleField = () => {
    const currentIndex = FIELD_CYCLE.indexOf(displayField);
    const nextIndex = (currentIndex + 1) % FIELD_CYCLE.length;
    onToggleField(FIELD_CYCLE[nextIndex]);
  };

  return (
    <Toolbar>
      <div className="flex-1 min-w-50">
        <Input
          id="kanban-search"
          label="Search"
          placeholder="Search by description..."
          showSearchIcon
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Button variant="ghost" onClick={onClear}>
        Clear
      </Button>

      <div className="grow" />

      <button
        onClick={handleCycleField}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
        title="Click to cycle display field"
      >
        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Show:</span>
        <span>{FIELD_LABELS[displayField]}</span>
      </button>
    </Toolbar>
  );
}
