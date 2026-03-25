"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import ConjecturalDetailView from "./ConjecturalDetailView";
import type { ConjecturalRequirement, ConjecturalStatus } from "@/types";
import type { DisplayField } from "./KanbanToolbar";

interface KanbanBoardProps {
  requirements: ConjecturalRequirement[];
  displayField: DisplayField;
  userId: string;
  isLoading: boolean;
  error: string | null;
  newCardIds: Set<string>;
  selectedRequirement: ConjecturalRequirement | null;
  onSelectRequirement: (req: ConjecturalRequirement | null) => void;
  onAnimationComplete: () => void;
  onStatusChange: (requirementId: string, newStatus: ConjecturalStatus) => void;
  onRequirementUpdated: (updated: ConjecturalRequirement) => void;
}

const COLUMNS: { key: ConjecturalStatus; label: string; color: string; bgHeader: string }[] = [
  {
    key: "todo",
    label: "To Do",
    color: "border-t-gray-400",
    bgHeader: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
  },
  {
    key: "inprogress",
    label: "In Progress",
    color: "border-t-blue-500",
    bgHeader: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  {
    key: "done",
    label: "Done",
    color: "border-t-green-500",
    bgHeader: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
];

const STATUS_BADGE_STYLES: Record<ConjecturalStatus, string> = {
  todo: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  inprogress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_LABELS: Record<ConjecturalStatus, string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

function getCardDescription(req: ConjecturalRequirement, field: DisplayField): string {
  if (field === "uncertainty") {
    return req.uncertainty;
  }
  return req[field];
}


function KanbanCard({
  requirement,
  displayField,
  isNew,
  onClick,
}: {
  requirement: ConjecturalRequirement;
  displayField: DisplayField;
  isNew: boolean;
  onClick: (req: ConjecturalRequirement) => void;
}) {
  const description = getCardDescription(requirement, displayField);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", requirement.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick(requirement)}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-border-light dark:border-border-dark p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isNew ? "animate-fade-in" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
          {requirement.cod_requirement ?? "—"}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE_STYLES[requirement.status]}`}>
          {STATUS_LABELS[requirement.status]}
        </span>
      </div>

      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
        {description}
      </p>
    </div>
  );
}

export default function KanbanBoard({
  requirements,
  displayField,
  userId,
  isLoading,
  error,
  newCardIds,
  selectedRequirement,
  onSelectRequirement,
  onAnimationComplete,
  onStatusChange,
  onRequirementUpdated,
}: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ConjecturalStatus | null>(null);

  // Clear animation flags after animation completes
  useEffect(() => {
    if (newCardIds.size === 0) return;
    const timer = setTimeout(onAnimationComplete, 10000);
    return () => clearTimeout(timer);
  }, [newCardIds, onAnimationComplete]);

  const grouped = useMemo(() => {
    const map: Record<ConjecturalStatus, ConjecturalRequirement[]> = {
      todo: [],
      inprogress: [],
      done: [],
    };
    for (const req of requirements) {
      map[req.status]?.push(req);
    }
    return map;
  }, [requirements]);

  const handleDragOver = useCallback((e: React.DragEvent, columnKey: ConjecturalStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, columnKey: ConjecturalStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const requirementId = e.dataTransfer.getData("text/plain");
    if (requirementId) {
      onStatusChange(requirementId, columnKey);
    }
  }, [onStatusChange]);

  const handleSaved = useCallback((updated: ConjecturalRequirement) => {
    onRequirementUpdated(updated);
    onSelectRequirement(null);
  }, [onRequirementUpdated, onSelectRequirement]);

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-center">{error}</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          onDragOver={(e) => handleDragOver(e, col.key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.key)}
          className={`rounded-xl border border-border-light dark:border-border-dark border-t-4 ${col.color}
            bg-surface-light dark:bg-surface-dark overflow-hidden transition-colors
            ${dragOverColumn === col.key ? "ring-2 ring-primary/50 bg-primary/5 dark:bg-primary/10" : ""}`}
        >
          {/* Column Header */}
          <div className={`px-4 py-3 ${col.bgHeader} flex items-center justify-between`}>
            <h3 className="text-sm font-semibold">{col.label}</h3>
            <span className="text-xs font-medium opacity-70">
              {grouped[col.key].length}
            </span>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="h-0.5 overflow-hidden">
              <div className="h-full w-1/3 bg-primary/40 rounded animate-[shimmer_1.2s_ease-in-out_infinite]" />
            </div>
          )}

          {/* Cards */}
          <div className="p-3 space-y-3 h-155 overflow-y-auto">
            {grouped[col.key].length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                {dragOverColumn === col.key ? "Drop here" : isLoading ? "Loading..." : "No requirements"}
              </p>
            ) : (
              grouped[col.key].map((req) => (
                <KanbanCard
                  key={req.id}
                  requirement={req}
                  displayField={displayField}
                  isNew={newCardIds.has(req.id)}
                  onClick={onSelectRequirement}
                />
              ))
            )}
          </div>
        </div>
      ))}

      <ConjecturalDetailView
        open={!!selectedRequirement}
        requirement={selectedRequirement}
        userId={userId}
        onClose={() => onSelectRequirement(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
