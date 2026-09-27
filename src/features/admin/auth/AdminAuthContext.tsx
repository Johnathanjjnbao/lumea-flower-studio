import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../../../lib/supabase";
import type { AdminProfile } from "../types";

type AdminAuthStatus = "loading" | "configuration-error" | "signed-out" | "unauthorized" | "authenticated";

interface AdminAuthValue {
  status: AdminAuthStatus;
  email: string | null;
  profile: AdminProfile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminAuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (session?: Session | null) => {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      setStatus("configuration-error");
      setError("Bản build này chưa có cấu hình Supabase công khai hợp lệ.");
      return;
    }
    if (!client) {
      setStatus("configuration-error");
      setError("Bản build này chưa được cấu hình để kết nối Supabase.");
      return;
    }
    setStatus("loading");
    setError(null);
    const activeSession = session === undefined ? (await client.auth.getSession()).data.session : session;
    if (!activeSession) {
      setEmail(null);
      setProfile(null);
      setStatus("signed-out");
      return;
    }
    setEmail(activeSession.user.email ?? null);
    const { data, error: profileError } = await client
      .from("admin_profiles")
      .select("id, auth_user_id, display_name, role, active")
      .eq("auth_user_id", activeSession.user.id)
      .eq("active", true)
      .maybeSingle();
    if (profileError) {
      setProfile(null);
      setStatus("unauthorized");
      setError("Không thể xác minh quyền quản trị. Vui lòng đăng nhập lại hoặc liên hệ chủ sở hữu.");
      return;
    }
    if (!data || data.role !== "ADMIN") {
      setProfile(data ? {
        id: data.id,
        authUserId: data.auth_user_id,
        displayName: data.display_name,
        role: data.role,
      } : null);
      setStatus("unauthorized");
      setError(data?.role === "STAFF"
        ? "Quyền STAFF chưa được owner phê duyệt cho Product/Media ở bước này."
        : "Tài khoản này chưa có hồ sơ Admin đang hoạt động.");
      return;
    }
    setProfile({
      id: data.id,
      authUserId: data.auth_user_id,
      displayName: data.display_name,
      role: data.role,
    });
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    void loadSession();
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return;
    }
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      void loadSession(session);
    });
    return () => data.subscription.unsubscribe();
  }, [loadSession]);

  const signIn = useCallback(async (nextEmail: string, password: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    const { data, error: signInError } = await client.auth.signInWithPassword({ email: nextEmail.trim(), password });
    if (signInError) throw new Error("Email hoặc mật khẩu không đúng.");
    await loadSession(data.session);
  }, [loadSession]);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    setEmail(null);
    setProfile(null);
    setStatus("signed-out");
  }, []);

  const value = useMemo<AdminAuthValue>(() => ({
    status,
    email,
    profile,
    error,
    signIn,
    signOut,
    refresh: () => loadSession(),
  }), [email, error, loadSession, profile, signIn, signOut, status]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return value;
}
