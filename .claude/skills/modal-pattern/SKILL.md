---
name: modal-pattern
description: Use this skill when creating or reviewing modal/dialog components to ensure they follow the project's standardized modal patterns (layout, behavior, styling).
---

# Modal Pattern — Project Standard

All modals in this project MUST follow the patterns below. Use this as a checklist when creating new modals or fixing existing ones.

## 1. Overlay (outer container)

```tsx
<div
  className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
```

Rules:
- `items-start` (NOT `items-center`) — modal is anchored toward the top
- `pt-[15vh]` — consistent top spacing across all modals
- `bg-black/60` — overlay darkness
- Click-outside-to-close via `onClick` checking `e.target === e.currentTarget`

## 2. Modal container (inner)

```tsx
<div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-surface-dark shadow-2xl border border-border-light dark:border-border-dark">
```

Rules:
- `rounded-2xl` (NOT `rounded-xl`)
- `bg-white dark:bg-surface-dark` (NOT `bg-background-light dark:bg-background-dark`)
- Always include `border border-border-light dark:border-border-dark`
- Always include `shadow-2xl`

## 3. ESC key to close

Every modal component MUST include a `useEffect` for closing on the Escape key:

```tsx
import { useEffect } from 'react';

// Inside the component, BEFORE the early return (`if (!open) return null`)
useEffect(() => {
  if (!open) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [open, onClose]);
```

## 4. Header

```tsx
<div className="flex items-start justify-between border-b border-border-light dark:border-border-dark px-6 py-4">
  <div>
    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Section Label</p>
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">Title</h2>
  </div>
  <button
    onClick={onClose}
    className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    aria-label="Close modal"
  >
    <X className="w-5 h-5" />
  </button>
</div>
```

## 5. Scrollable content area

```tsx
<div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
  {/* content */}
</div>
```

## 6. Footer with Close button

```tsx
<div className="flex justify-end border-t border-border-light dark:border-border-dark px-6 py-4">
  <button
    onClick={onClose}
    className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
  >
    Close
  </button>
</div>
```

Rules:
- Close button MUST have a visible `border`
- Use `rounded-xl` for buttons (NOT `rounded-lg`)
- If there are action buttons, place them after Close with gap-3

## 7. Input fields (dark mode)

All `<input>` and `<textarea>` elements inside modals must include `dark:text-gray-200` to ensure text is visible in dark mode.

## Reference modals

- `src/components/settings/SettingsModal.tsx` — canonical reference
- `src/components/projects/AddProjectPopup.tsx`
- `src/components/projects/ProjectDetailsModal.tsx`
- `src/components/requirements/RequirementDetailsModal.tsx`
