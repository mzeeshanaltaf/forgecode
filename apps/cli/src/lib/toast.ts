import { useSyncExternalStore } from "react";

/**
 * Sonner-style toast notifications.
 *
 * The state lives in a module-level store rather than React context, so the
 * imperative API can be called from anywhere — React components, event
 * handlers, or plain modules like `commands.ts`:
 *
 * ```ts
 * import { toast } from "../lib/toast";
 *
 * toast("Saved");
 * toast.success("Theme applied", { description: "Tokyo Night is now active" });
 * toast.error("Could not reach the server");
 * const id = toast.info("Working…", { duration: 10_000 });
 * toast.dismiss(id);
 * ```
 *
 * Render `<Toaster />` once near the root of the app to display them. The store
 * here owns no view concerns; `<Toaster />` subscribes via {@link useToasts}.
 */

export type ToastVariant = "default" | "success" | "error" | "info" | "warning";

export interface ToastOptions {
  /** Secondary line shown beneath the title. */
  description?: string;
  /** Milliseconds before the toast auto-closes. Defaults to {@link DEFAULT_TOAST_DURATION}. */
  duration?: number;
}

export interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export const DEFAULT_TOAST_DURATION = 4000;

type Listener = () => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const listener of listeners) listener();
}

function add(title: string, variant: ToastVariant, options?: ToastOptions): number {
  const id = nextId++;
  toasts = [
    ...toasts,
    {
      id,
      title,
      variant,
      description: options?.description,
      duration: options?.duration ?? DEFAULT_TOAST_DURATION,
    },
  ];
  emit();
  return id;
}

/** Remove a toast by id, or all toasts when called with no argument. */
function dismiss(id?: number) {
  toasts = id === undefined ? [] : toasts.filter((toast) => toast.id !== id);
  emit();
}

/**
 * Trigger a toast. The base call uses the neutral "default" variant; the
 * attached methods select a semantic variant. Every call returns the new
 * toast's id, which can be passed to {@link toast.dismiss} to close it early.
 */
export const toast = Object.assign(
  (title: string, options?: ToastOptions) => add(title, "default", options),
  {
    success: (title: string, options?: ToastOptions) => add(title, "success", options),
    error: (title: string, options?: ToastOptions) => add(title, "error", options),
    info: (title: string, options?: ToastOptions) => add(title, "info", options),
    warning: (title: string, options?: ToastOptions) => add(title, "warning", options),
    dismiss,
  },
);

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Toast[] {
  return toasts;
}

/** Reactive view of the active toasts. Consumed by `<Toaster />`. */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
