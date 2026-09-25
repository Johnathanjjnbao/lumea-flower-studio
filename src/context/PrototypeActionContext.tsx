import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface PrototypeActionContextValue {
  showPrototypeAction: (title: string) => void;
}

const PrototypeActionContext = createContext<PrototypeActionContextValue | null>(null);

export function PrototypeActionProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const showPrototypeAction = useCallback((nextTitle: string) => {
    setTitle(nextTitle);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setTitle(null), 3200);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <PrototypeActionContext.Provider value={{ showPrototypeAction }}>
      {children}
      <div className="prototype-toast" role="status" aria-live="polite" hidden={!title}>
        <strong>{title}</strong>
        <span>Tính năng này đang được Luméa hoàn thiện.</span>
      </div>
    </PrototypeActionContext.Provider>
  );
}

export function usePrototypeAction() {
  const context = useContext(PrototypeActionContext);
  if (!context) throw new Error("usePrototypeAction must be used within PrototypeActionProvider");
  return context;
}
