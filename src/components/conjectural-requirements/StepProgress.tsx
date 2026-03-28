"use client";

import { createPortal } from "react-dom";
import {
  Settings,
  Network,
  Bot,
} from "lucide-react";

interface StepState {
  step1_elicitation: boolean;
  step2_analysis: boolean;
  step3_specification: boolean;
  step4_validation: boolean;
  pending_progress: boolean;
  progress_message: string;
}

interface StepProgressProps {
  status: string;
  state: StepState;
  nodeName?: string;
  runId?: string;
}

type NodeStatus = "active" | "completed" | "pending";

const workerNodes = [
  { key: "step1_elicitation", label: "Elicitation", icon: Bot },
  { key: "step2_analysis", label: "Analysis", icon: Bot },
  { key: "step3_specification", label: "Specification", icon: Bot },
  { key: "step4_validation", label: "Validation", icon: Bot },
] as const;

function getActiveIndex(s1: boolean, s2: boolean, s3: boolean, s4: boolean): number {
  if (!s1) return 0;
  if (!s2) return 1;
  if (!s3) return 2;
  if (!s4) return 3;
  return -1; // all complete
}

function getNodeStatus(index: number, activeIndex: number, completedFlags: boolean[]): NodeStatus {
  if (index === activeIndex) return "active";
  if (completedFlags[index]) return "completed";
  return "pending";
}

/* ───── Sub-components ───── */

function OverlayCard({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 dark:bg-black/50">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/95 dark:bg-surface-dark/95 p-8 shadow-2xl backdrop-blur-sm border border-border-light dark:border-border-dark min-w-[420px]">
        {children}
      </div>
    </div>,
    document.body
  );
}

function CoordinatorNode() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/60">
        <Network className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </div>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">
        Coordinator
      </span>
    </div>
  );
}

function WorkerNode({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: NodeStatus;
}) {
  const base = "flex items-center justify-center w-11 h-11 rounded-full border-2 transition-all duration-500";

  const variants: Record<NodeStatus, string> = {
    active:
      "border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/40 animate-pulse-ring",
    completed:
      "border-gray-200 dark:border-gray-600 border-dashed bg-gray-50/50 dark:bg-gray-800/30",
    pending:
      "border-gray-200 dark:border-gray-600 border-dashed bg-gray-50/50 dark:bg-gray-800/30",
  };

  const iconVariants: Record<NodeStatus, string> = {
    active: "w-5 h-5 text-orange-500 dark:text-orange-400",
    completed: "w-5 h-5 text-gray-300 dark:text-gray-600",
    pending: "w-5 h-5 text-gray-300 dark:text-gray-600",
  };

  const labelVariants: Record<NodeStatus, string> = {
    active: "text-orange-600 dark:text-orange-400 font-semibold",
    completed: "text-gray-400 dark:text-gray-600 font-medium",
    pending: "text-gray-400 dark:text-gray-600 font-medium",
  };

  return (
    <div className="flex flex-col items-center gap-1 w-[76px]">
      <div className="relative">
        <div className={`${base} ${variants[status]}`}>
          <Icon className={iconVariants[status]} />
        </div>
      </div>
      <span className={`text-[10px] tracking-wide uppercase ${labelVariants[status]}`}>
        {label}
      </span>
    </div>
  );
}

function TravelingDot({ nodePosition, activeIndex }: { nodePosition: number; activeIndex: number }) {
  // Calculate timing proportions so the dot moves at roughly constant speed.
  // Path: center(50%) ↓16px → horizontal → nodePosition% ↓28px
  const horizontalDist = Math.abs(50 - nodePosition) * 4; // rough px equivalent (~400px container)
  const total = 16 + horizontalDist + 28;
  const pct1 = Math.round((16 / total) * 100);
  const pct2 = Math.round(((16 + horizontalDist) / total) * 100);

  const animName = `travelDot-${activeIndex}`;
  const keyframes = `
    @keyframes ${animName} {
      0%       { left: 50%; top: 0px; opacity: 0; }
      3%       { left: 50%; top: 0px; opacity: 1; }
      ${pct1}% { left: 50%; top: 16px; opacity: 1; }
      ${pct2}% { left: ${nodePosition}%; top: 16px; opacity: 1; }
      95%      { left: ${nodePosition}%; top: 42px; opacity: 1; }
      100%     { left: ${nodePosition}%; top: 44px; opacity: 0; }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div
        className="absolute w-[6px] h-[6px] rounded-full bg-orange-400 dark:bg-orange-500 -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ animation: `${animName} 2s linear infinite` }}
      />
    </>
  );
}

function ConnectionLines({ activeIndex }: { activeIndex: number }) {
  const nodePositions = [12.5, 37.5, 62.5, 87.5];
  const hasActive = activeIndex >= 0 && activeIndex < nodePositions.length;

  return (
    <div className="relative w-full" style={{ height: 44 }}>
      {/* Vertical line from coordinator down to horizontal bar */}
      <div
        className="absolute left-1/2 top-0 w-px -translate-x-1/2"
        style={{ height: 16 }}
      >
        <div className={`w-full h-full transition-colors duration-500 ${
          hasActive ? "bg-orange-400 dark:bg-orange-500" : "bg-gray-200 dark:bg-gray-700"
        }`} />
      </div>

      {/* Horizontal bar (gray base) */}
      <div
        className="absolute top-4 bg-gray-200 dark:bg-gray-700"
        style={{ left: `${nodePositions[0]}%`, right: `${100 - nodePositions[3]}%`, height: 1 }}
      />

      {/* Active horizontal path segment (orange, from center to active node) */}
      {hasActive && (() => {
        const nodePos = nodePositions[activeIndex];
        const left = Math.min(50, nodePos);
        const right = 100 - Math.max(50, nodePos);
        return (
          <div
            className="absolute top-4 bg-orange-400 dark:bg-orange-500 transition-all duration-500"
            style={{ left: `${left}%`, right: `${right}%`, height: 1 }}
          />
        );
      })()}

      {/* Vertical lines from horizontal bar down to each node */}
      {nodePositions.map((pos, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2"
            style={{ left: `${pos}%`, top: 16, height: 28 }}
          >
            <div
              className={`w-px h-full transition-colors duration-500 ${
                isActive
                  ? "bg-orange-400 dark:bg-orange-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          </div>
        );
      })}

      {/* Traveling dot along active path */}
      {hasActive && (
        <TravelingDot key={activeIndex} nodePosition={nodePositions[activeIndex]} activeIndex={activeIndex} />
      )}
    </div>
  );
}

/* ───── Main Component ───── */

export default function StepProgress({ state }: StepProgressProps) {
  const s1 = state.step1_elicitation;
  const s2 = state.step2_analysis;
  const s3 = state.step3_specification;
  const s4 = state.step4_validation;
  const pending = state.pending_progress;

  // State 1: Initial loading (before pending_progress)
  if (!pending) {
    return (
      <OverlayCard>
        <Settings
          className="h-12 w-12 text-orange-500 dark:text-orange-400 animate-spin"
          style={{ animationDuration: "3s" }}
        />
        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Processing request...
        </span>
      </OverlayCard>
    );
  }

  const activeIndex = getActiveIndex(s1, s2, s3, s4);
  const completedFlags = [s1, s2, s3, s4];
  const allComplete = activeIndex === -1;

  // State 3: All complete
  if (allComplete) {
    return (
      <OverlayCard>
        {/* Coordinator */}
        <CoordinatorNode />

        {/* Connections */}
        <ConnectionLines activeIndex={-1} />

        {/* Worker nodes */}
        <div className="flex justify-between w-full px-2">
          {workerNodes.map((node) => (
            <WorkerNode
              key={node.key}
              icon={node.icon}
              label={node.label}
              status="completed"
            />
          ))}
        </div>

        {/* Legend */}
        <span className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
          Complete!
        </span>
      </OverlayCard>
    );
  }

  // State 2: In progress
  return (
    <OverlayCard>
      {/* Coordinator */}
      <CoordinatorNode />

      {/* Connections */}
      <ConnectionLines activeIndex={activeIndex} />

      {/* Worker nodes */}
      <div className="flex justify-between w-full px-2">
        {workerNodes.map((node, i) => (
          <WorkerNode
            key={node.key}
            icon={node.icon}
            label={node.label}
            status={getNodeStatus(i, activeIndex, completedFlags)}
          />
        ))}
      </div>

      {/* Legend */}
      <span className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {state.progress_message || "Processing conjectural requirements..."}
      </span>
    </OverlayCard>
  );
}
