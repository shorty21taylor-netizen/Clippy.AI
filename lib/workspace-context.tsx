"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceContextValue {
  workspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  setActiveWorkspace: (ws: WorkspaceInfo) => void;
  isLoading: boolean;
  refresh: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  workspaces: [],
  setActiveWorkspace: () => {},
  isLoading: true,
  refresh: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      // On any non-ok response (401 unauthenticated, 500 DB error, etc.)
      // we still fall through to the finally so isLoading becomes false
      // and the UI can render an appropriate empty/error state.
      if (!res.ok) return;
      const data = await res.json();
      const list: WorkspaceInfo[] = data.workspaces ?? [];
      setWorkspaces(list);

      if (list.length > 0) {
        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem("activeWorkspaceId")
            : null;
        const found = savedId ? list.find((w) => w.id === savedId) : null;
        setWorkspace(found ?? list[0]);
      }
    } catch {
      // Network failure or JSON parse error — isLoading will be set false in finally
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const setActiveWorkspace = (ws: WorkspaceInfo) => {
    setWorkspace(ws);
    localStorage.setItem("activeWorkspaceId", ws.id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaces,
        setActiveWorkspace,
        isLoading,
        refresh: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
