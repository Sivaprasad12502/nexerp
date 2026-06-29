"use client";

import type { GreetingTemplate } from "@/lib/greeting-templates";

export function TemplatePicker({
  templates,
  selectedId,
  onSelect,
}: {
  templates: GreetingTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="border-t border-zinc-200 bg-white px-6 py-5 sm:px-8">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800">Select Template</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {templates.map((template) => {
          const selected = template.id === selectedId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={`relative shrink-0 overflow-hidden rounded-md transition-shadow ${
                selected
                  ? "ring-2 ring-[#dc2626] ring-offset-2"
                  : "ring-1 ring-zinc-200 hover:ring-zinc-300"
              }`}
              aria-label={template.label}
              aria-pressed={selected}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={template.thumbPath}
                alt={template.label}
                className="h-24 w-36 object-cover"
                onError={(e) => {
                  e.currentTarget.src = template.imagePath;
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
