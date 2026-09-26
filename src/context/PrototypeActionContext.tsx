import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";

interface PrototypeActionContextValue {
  showPrototypeAction: (title: string, message?: string) => void;
}

const PrototypeActionContext = createContext<PrototypeActionContextValue | null>(null);

export function PrototypeActionProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  const showPrototypeAction = useCallback((title: string, message = t.common.prototypeMessage) => {
    setToast({ title, message });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, [t.common.prototypeMessage]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <PrototypeActionContext.Provider value={{ showPrototypeAction }}>
      {children}
      <div className="prototype-toast" role="status" aria-live="polite" hidden={!toast}>
        <strong>{toast?.title}</strong>
        <span>{toast?.message}</span>
      </div>
    </PrototypeActionContext.Provider>
  );
}

export function usePrototypeAction() {
  const context = useContext(PrototypeActionContext);
  if (!context) throw new Error("usePrototypeAction must be used within PrototypeActionProvider");
  return context;
}
