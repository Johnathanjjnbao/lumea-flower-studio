import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthContext";

export function AdminLoginPage() {
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from || "/admin/products";

  useEffect(() => {
    document.title = "Đăng nhập Admin — Luméa";
  }, []);

  if (auth.status === "loading") return <main className="admin-gate" aria-busy="true"><p>Đang xác minh phiên quản trị…</p></main>;
  if (auth.status === "authenticated") return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await auth.signIn(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đăng nhập.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login__brand" aria-label="Luméa Flower Studio">
        <span className="admin-kicker">PRIVATE ATELIER</span>
        <strong>LUMÉA</strong>
        <p>Quản lý bộ sưu tập hoa và hình ảnh studio trong một không gian riêng.</p>
      </section>
      <section className="admin-login__panel">
        <div>
          <span className="admin-kicker">ADMIN ACCESS</span>
          <h1>Đăng nhập quản trị</h1>
          <p>Chỉ dành cho tài khoản đã được chủ sở hữu cấp quyền.</p>
        </div>
        {auth.status === "configuration-error" ? (
          <p className="admin-alert admin-alert--error" role="alert">{auth.error}</p>
        ) : (
          <form className="admin-form-stack" onSubmit={submit}>
            <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {message && <p className="admin-alert admin-alert--error" role="alert">{message}</p>}
            {auth.status === "unauthorized" && auth.error && <p className="admin-alert admin-alert--error" role="alert">{auth.error}</p>}
            <button className="admin-button admin-button--primary" type="submit" disabled={submitting}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</button>
          </form>
        )}
        <a className="admin-back-link" href={import.meta.env.BASE_URL}>← Trở về website</a>
      </section>
    </main>
  );
}
