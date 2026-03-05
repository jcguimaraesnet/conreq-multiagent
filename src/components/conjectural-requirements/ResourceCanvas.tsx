"use client";

import Card from "@/components/ui/Card";

interface ResourceCanvasProps {
  resources: string[];
}

export default function ResourceCanvas({ resources }: ResourceCanvasProps) {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
        Canvas Resources
      </h2>

      {resources.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No resources yet. Generate conjectural requirements to populate the canvas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {resources.map((resource, idx) => (
            <Card key={idx} className="w-56 flex-shrink-0">
              <p className="text-sm font-mono text-gray-700 dark:text-gray-200 break-all">
                {resource}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
