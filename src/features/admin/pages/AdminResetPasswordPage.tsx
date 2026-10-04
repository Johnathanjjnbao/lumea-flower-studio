import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../../../i18n";
import { useAdminAuth } from "../auth/AdminAuthContext";
import {
  clearAdminRecoveryMarker,
  getAdminRecoverySession,
  getAdminRecoveryUrlState,
  hasValidAdminRecoveryMarker,
  subscribeToAdminPasswordRecovery,
  updateAdminPassword,
  validateAdminPassword,
  writeAdminRecoveryMarker,
} from "../auth/adminRecovery";
import { AdminAuthLayout } from "../components/AdminAuthLayout";

type VerificationState = "checking" | "ready" | "invalid";

function sessionStorageOrNull() {
  try { return window.sessionStorage; } catch { return null; }
}

export function AdminResetPasswordPage() {
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const { path, t } = useI18n();
  const [initialUrlState] = useState(() => getAdminRecoveryUrlState(window.location.href));
  const [hadMarkerAtLoad] = useState(() => hasValidAdminRecoveryMarker(sessionStorageOrNull()));
  const [verification, setVerification] = useState<VerificationState>(
    initialUrlState === "error" || (initialUrlState === "none" && !hadMarkerAtLoad) ? "invalid" : "checking",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${t.adminAuth.reset.title} — Luméa`;
  }, [t.adminAuth.reset.title]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (initialUrlState === "error" || (initialUrlState === "none" && !hadMarkerAtLoad)) return;
    let active = true;
    const storage = sessionStorageOrNull();

    let subscription;
    try {
      subscription = subscribeToAdminPasswordRecovery((event, session) => {
        if (!active || event !== "PASSWORD_RECOVERY" || !session) return;
        writeAdminRecoveryMarker(storage);
        setVerification("ready");
      });
    } catch {
      setVerification("invalid");
      return;
    }

    void getAdminRecoverySession()
      .then((session) => {
        if (!active) return;
        if (initialUrlState === "none" && hadMarkerAtLoad && session) {
          setVerification("ready");
          return;
        }
        if (initialUrlState === "recovery" && session) {
          writeAdminRecoveryMarker(storage);
          setVerification("ready");
          return;
        }
        setVerification("invalid");
      })
      .catch(() => { if (active) setVerification("invalid"); });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hadMarkerAtLoad, initialUrlState]);

  useEffect(() => {
    if (verification === "ready" && auth.status === "unauthorized") {
      clearAdminRecoveryMarker(sessionStorageOrNull());
      setVerification("invalid");
    }
  }, [auth.status, verification]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateAdminPassword(password, confirmation);
    if (validation) {
      const messages = {
        "password-required": t.adminAuth.reset.passwordRequired,
        "password-too-short": t.adminAuth.reset.passwordTooShort,
        "confirmation-required": t.adminAuth.reset.confirmationRequired,
        mismatch: t.adminAuth.reset.mismatch,
      };
      setError(messages[validation]);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateAdminPassword(password);
      clearAdminRecoveryMarker(sessionStorageOrNull());
      navigate(path("/admin/login"), { replace: true, state: { passwordReset: true } });
    } catch {
      setError(t.adminAuth.reset.updateError);
    } finally {
      setSubmitting(false);
    }
  }

  const invalid = verification === "invalid" || (verification === "ready" && auth.status === "unauthorized");
  const ready = verification === "ready" && auth.status === "authenticated";

  return (
    <AdminAuthLayout
      eyebrow={t.adminAuth.reset.eyebrow}
      title={t.adminAuth.reset.title}
      intro={t.adminAuth.reset.intro}
      showLanguageSwitcher={verification !== "checking"}
    >
      {invalid ? (
        <div className="admin-auth-invalid" role="alert">
          <h2>{t.adminAuth.reset.invalidTitle}</h2>
          <p>{t.adminAuth.reset.invalidText}</p>
          <Link className="admin-button admin-button--primary" to={path("/admin/forgot-password")}>{t.adminAuth.reset.requestNew}</Link>
        </div>
      ) : !ready ? (
        <p className="admin-alert" role="status" aria-live="polite">{t.adminAuth.reset.checking}</p>
      ) : (
        <form className="admin-form-stack" noValidate onSubmit={submit}>
          {error && <div className="admin-alert admin-alert--error" role="alert" tabIndex={-1} ref={errorRef}><a href="#admin-new-password">{error}</a></div>}
          <label htmlFor="admin-new-password">{t.adminAuth.reset.password}
            <input id="admin-new-password" type="password" autoComplete="new-password" required aria-invalid={Boolean(error)} value={password} onChange={(event) => setPassword(event.target.value)} />
            <small>{t.adminAuth.reset.passwordHelp}</small>
          </label>
          <label htmlFor="admin-confirm-password">{t.adminAuth.reset.confirmPassword}
            <input id="admin-confirm-password" type="password" autoComplete="new-password" required aria-invalid={Boolean(error)} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <button className="admin-button admin-button--primary" type="submit" disabled={submitting}>{submitting ? t.adminAuth.reset.submitting : t.adminAuth.reset.submit}</button>
        </form>
      )}
      <Link className="admin-auth-text-link" to={path("/admin/login")}>{t.adminAuth.backToLogin}</Link>
    </AdminAuthLayout>
  );
}
