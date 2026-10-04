import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../i18n";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { AdminAuthLayout } from "../components/AdminAuthLayout";

export function AdminLoginPage() {
  const auth = useAdminAuth();
  const { path, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const routeState = location.state as { from?: string; passwordReset?: boolean } | null;
  const returnPath = routeState?.from;
  const from = returnPath === "/admin"
    || returnPath?.startsWith("/admin/")
    || returnPath === "/ko/admin"
    || returnPath?.startsWith("/ko/admin/")
    ? returnPath
    : path("/admin/products");

  useEffect(() => {
    document.title = `${t.adminAuth.login.title} — Luméa`;
  }, [t.adminAuth.login.title]);

  if (auth.status === "loading") return <main className="admin-gate" aria-busy="true"><p>{t.adminAuth.login.loading}</p></main>;
  if (auth.status === "authenticated") return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await auth.signIn(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error && error.message === "INVALID_CREDENTIALS"
        ? t.adminAuth.login.invalidCredentials
        : t.adminAuth.login.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthLayout eyebrow={t.adminAuth.login.eyebrow} title={t.adminAuth.login.title} intro={t.adminAuth.login.intro}>
        {routeState?.passwordReset && <p className="admin-alert admin-alert--success" role="status">{t.adminAuth.login.resetSuccess}</p>}
        {auth.status === "configuration-error" ? (
          <p className="admin-alert admin-alert--error" role="alert">{t.adminAuth.login.genericError}</p>
        ) : (
          <form className="admin-form-stack" onSubmit={submit}>
            <label htmlFor="admin-login-email">{t.adminAuth.login.email}<input id="admin-login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label htmlFor="admin-login-password">{t.adminAuth.login.password}<input id="admin-login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <Link className="admin-auth-text-link" to={path("/admin/forgot-password")}>{t.adminAuth.login.forgot}</Link>
            {message && <p className="admin-alert admin-alert--error" role="alert">{message}</p>}
            {auth.status === "unauthorized" && <p className="admin-alert admin-alert--error" role="alert">{t.adminAuth.login.genericError}</p>}
            <button className="admin-button admin-button--primary" type="submit" disabled={submitting}>{submitting ? t.adminAuth.login.submitting : t.adminAuth.login.submit}</button>
          </form>
        )}
    </AdminAuthLayout>
  );
}
