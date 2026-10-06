import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TEST_SITE_KEY = "1x00000000000000000000AA";

interface TurnstileApi {
  render(container: HTMLElement, options: {
    sitekey: string;
    action: "checkout_submit";
    language: "vi" | "ko";
    theme: "light";
    callback(token: string): void;
    "expired-callback"(): void;
    "error-callback"(): void;
    "timeout-callback"(): void;
  }): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetHandle {
  reset(): void;
}

interface TurnstileWidgetProps {
  locale: "vi" | "ko";
  label: string;
  help: string;
  unavailable: string;
  onTokenChange(token: string | null): void;
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const onLoad = () => window.turnstile ? resolve() : reject(new Error("TURNSTILE_API_UNAVAILABLE"));
    const onError = () => reject(new Error("TURNSTILE_SCRIPT_UNAVAILABLE"));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { locale, label, help, unavailable, onTokenChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const configuredSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  const siteKey = configuredSiteKey || (import.meta.env.DEV ? TEST_SITE_KEY : "");

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenChange(null);
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    },
  }), [onTokenChange]);

  useEffect(() => {
    let active = true;
    if (!siteKey) {
      setLoadFailed(true);
      onTokenChange(null);
      return;
    }
    setLoadFailed(false);
    void loadTurnstile().then(() => {
      if (!active || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "checkout_submit",
        language: locale,
        theme: "light",
        callback: (token) => { if (active) onTokenChange(token); },
        "expired-callback": () => { if (active) onTokenChange(null); },
        "error-callback": () => { if (active) onTokenChange(null); },
        "timeout-callback": () => { if (active) onTokenChange(null); },
      });
    }).catch(() => {
      if (active) {
        setLoadFailed(true);
        onTokenChange(null);
      }
    });
    return () => {
      active = false;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [locale, onTokenChange, siteKey]);

  return <div className="checkout-verification" aria-labelledby="checkout-verification-label">
    <strong id="checkout-verification-label">{label}</strong>
    <p>{help}</p>
    <div ref={containerRef} />
    {loadFailed && <p className="checkout-verification__error" role="alert">{unavailable}</p>}
  </div>;
});
