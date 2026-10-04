import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../../i18n";
import { isValidAdminEmail, requestAdminPasswordRecovery } from "../auth/adminRecovery";
import { AdminAuthLayout } from "../components/AdminAuthLayout";

export function AdminForgotPasswordPage() {
  const { locale, path, t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${t.adminAuth.forgot.title} — Luméa`;
  }, [t.adminAuth.forgot.title]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t.adminAuth.forgot.emailRequired);
      return;
    }
    if (!isValidAdminEmail(trimmedEmail)) {
      setError(t.adminAuth.forgot.emailInvalid);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestAdminPasswordRecovery(trimmedEmail, locale);
      setSent(true);
    } catch {
      setError(t.adminAuth.forgot.requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthLayout eyebrow={t.adminAuth.forgot.eyebrow} title={t.adminAuth.forgot.title} intro={t.adminAuth.forgot.intro}>
      {sent ? (
        <div className="admin-auth-sent" role="status">
          <h2>{t.adminAuth.forgot.sentTitle}</h2>
          <p>{t.adminAuth.forgot.sentText}</p>
          <button className="admin-button admin-button--secondary" type="button" onClick={() => setSent(false)}>{t.adminAuth.forgot.sendAgain}</button>
        </div>
      ) : (
        <form className="admin-form-stack" noValidate onSubmit={submit}>
          {error && <div className="admin-alert admin-alert--error" role="alert" tabIndex={-1} ref={errorRef}><a href="#admin-recovery-email">{error}</a></div>}
          <label htmlFor="admin-recovery-email">{t.adminAuth.forgot.email}
            <input id="admin-recovery-email" type="email" inputMode="email" autoComplete="username" required aria-invalid={Boolean(error)} value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="admin-button admin-button--primary" type="submit" disabled={submitting}>{submitting ? t.adminAuth.forgot.submitting : t.adminAuth.forgot.submit}</button>
        </form>
      )}
      <Link className="admin-auth-text-link" to={path("/admin/login")}>{t.adminAuth.backToLogin}</Link>
    </AdminAuthLayout>
  );
}
