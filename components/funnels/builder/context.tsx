"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Block,
  BlockType,
  ElementStyles,
  BLOCK_DEFAULTS,
  newBlockId,
} from "@/types/funnel";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface BuilderContextValue {
  blocks: Block[];
  selectedBlockId: string | null;
  deviceMode: DeviceMode;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;

  selectBlock: (id: string | null) => void;
  setDeviceMode: (mode: DeviceMode) => void;

  addBlock: (type: BlockType, afterId?: string) => string;
  updateBlock: (id: string, data: Record<string, unknown>) => void;
  updateBlockStyles: (id: string, styles: ElementStyles) => void;
  updateBlockName: (id: string, name: string) => void;
  toggleBlockHidden: (id: string) => void;
  toggleBlockLocked: (id: string) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  duplicateBlock: (id: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;

  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function BuilderProvider({
  children,
  initialBlocks,
}: {
  children: React.ReactNode;
  initialBlocks: Block[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [isDirty, setIsDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const past = useRef<Block[][]>([]);
  const future = useRef<Block[][]>([]);

  const pushHistory = useCallback((prev: Block[]) => {
    past.current = [...past.current.slice(-50), prev];
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const applyBlocks = useCallback(
    (
      updater: Block[] | ((prev: Block[]) => Block[]),
      addToHistory = true
    ) => {
      setBlocks((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        if (addToHistory) {
          pushHistory(prev);
          setIsDirty(true);
        }
        return next;
      });
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    setBlocks((curr) => {
      future.current = [curr, ...future.current];
      setCanUndo(past.current.length > 0);
      setCanRedo(true);
      return prev;
    });
    setIsDirty(true);
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    setBlocks((curr) => {
      past.current = [...past.current, curr];
      setCanUndo(true);
      setCanRedo(future.current.length > 0);
      return next;
    });
    setIsDirty(true);
  }, []);

  const addBlock = useCallback(
    (type: BlockType, afterId?: string): string => {
      const block: Block = {
        id: newBlockId(),
        type,
        data: { ...BLOCK_DEFAULTS[type] },
      };
      applyBlocks((prev) => {
        if (!afterId) return [...prev, block];
        const idx = prev.findIndex((b) => b.id === afterId);
        if (idx === -1) return [...prev, block];
        const next = [...prev];
        next.splice(idx + 1, 0, block);
        return next;
      });
      setSelectedBlockId(block.id);
      return block.id;
    },
    [applyBlocks]
  );

  const updateBlock = useCallback(
    (id: string, data: Record<string, unknown>) => {
      applyBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, data } : b))
      );
    },
    [applyBlocks]
  );

  const updateBlockStyles = useCallback(
    (id: string, styles: ElementStyles) => {
      applyBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, styles } : b))
      );
    },
    [applyBlocks]
  );

  const updateBlockName = useCallback(
    (id: string, name: string) => {
      // Name change doesn't push undo history (non-destructive metadata)
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
      setIsDirty(true);
    },
    []
  );

  const toggleBlockHidden = useCallback(
    (id: string) => {
      applyBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b))
      );
    },
    [applyBlocks]
  );

  const toggleBlockLocked = useCallback(
    (id: string) => {
      applyBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b))
      );
    },
    [applyBlocks]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      applyBlocks((prev) => prev.filter((b) => b.id !== id));
      setSelectedBlockId((prev) => (prev === id ? null : prev));
    },
    [applyBlocks]
  );

  const moveBlock = useCallback(
    (id: string, direction: "up" | "down") => {
      applyBlocks((prev) => {
        const i = prev.findIndex((b) => b.id === id);
        if (direction === "up" && i <= 0) return prev;
        if (direction === "down" && i >= prev.length - 1) return prev;
        const next = [...prev];
        const swapIdx = direction === "up" ? i - 1 : i + 1;
        [next[i], next[swapIdx]] = [next[swapIdx], next[i]];
        return next;
      });
    },
    [applyBlocks]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      applyBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === id);
        if (idx === -1) return prev;
        const original = prev[idx];
        const copy: Block = {
          ...original,
          id: newBlockId(),
          data: { ...original.data },
        };
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        setTimeout(() => setSelectedBlockId(copy.id), 0);
        return next;
      });
    },
    [applyBlocks]
  );

  const reorderBlocks = useCallback(
    (fromIndex: number, toIndex: number) => {
      applyBlocks((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [applyBlocks]
  );

  const markSaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  return (
    <BuilderContext.Provider
      value={{
        blocks,
        selectedBlockId,
        deviceMode,
        isDirty,
        canUndo,
        canRedo,
        selectBlock: setSelectedBlockId,
        setDeviceMode,
        addBlock,
        updateBlock,
        updateBlockStyles,
        updateBlockName,
        toggleBlockHidden,
        toggleBlockLocked,
        deleteBlock,
        moveBlock,
        duplicateBlock,
        reorderBlocks,
        undo,
        redo,
        markSaved,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used inside BuilderProvider");
  return ctx;
}
