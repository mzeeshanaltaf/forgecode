import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * Priority bands for keyboard layers. Higher numbers receive keys first.
 * A modal layer (see {@link useKeyboardLayer}) blocks every layer beneath it,
 * so the bands also describe the visual stacking of interactive surfaces.
 */
export const KeyboardLayerPriority = {
  GLOBAL: 0,
  CHAT_INPUT: 10,
  DIALOG: 100,
} as const;

/** Return `true` to consume the key and stop it reaching lower layers. */
export type LayerKeyHandler = (key: KeyEvent) => boolean | void;

interface RegisterOptions {
  priority: number;
  /** When set, keys this layer doesn't consume are still withheld from lower layers. */
  modal?: boolean;
}

interface Layer extends Required<RegisterOptions> {
  seq: number;
  handler: LayerKeyHandler;
}

interface KeyboardLayerContextValue {
  register: (handler: LayerKeyHandler, options: RegisterOptions) => () => void;
}

const KeyboardLayerContext = createContext<KeyboardLayerContextValue | null>(null);

/**
 * Owns the single global keyboard subscription and dispatches each key down a
 * priority-ordered stack of layers. The first layer to return `true` consumes
 * the key; a `modal` layer additionally swallows any key it leaves unhandled.
 */
export function KeyboardLayerProvider({ children }: { children: ReactNode }) {
  const layersRef = useRef<Layer[]>([]);
  const seqRef = useRef(0);

  const register = useCallback(
    (handler: LayerKeyHandler, options: RegisterOptions) => {
      const layer: Layer = {
        seq: seqRef.current++,
        handler,
        priority: options.priority,
        modal: options.modal ?? false,
      };
      layersRef.current.push(layer);
      return () => {
        layersRef.current = layersRef.current.filter((l) => l !== layer);
      };
    },
    [],
  );

  useKeyboard((key) => {
    // Highest priority first; ties broken by most-recently registered.
    const ordered = [...layersRef.current].sort(
      (a, b) => b.priority - a.priority || b.seq - a.seq,
    );
    for (const layer of ordered) {
      if (layer.handler(key) === true) return;
      if (layer.modal) return;
    }
  });

  const value = useMemo<KeyboardLayerContextValue>(() => ({ register }), [register]);

  return (
    <KeyboardLayerContext.Provider value={value}>
      {children}
    </KeyboardLayerContext.Provider>
  );
}

/**
 * Register a keyboard layer for the lifetime of the calling component (or while
 * `enabled` is true). The latest `handler` is always invoked, so it may close
 * over fresh state without re-registering.
 */
export function useKeyboardLayer(
  handler: LayerKeyHandler,
  options: RegisterOptions,
  enabled = true,
) {
  const ctx = useContext(KeyboardLayerContext);
  if (!ctx) {
    throw new Error("useKeyboardLayer must be used within KeyboardLayerProvider");
  }

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const { priority, modal = false } = options;

  useEffect(() => {
    if (!enabled) return;
    return ctx.register((key) => handlerRef.current(key), { priority, modal });
  }, [ctx, priority, modal, enabled]);
}
