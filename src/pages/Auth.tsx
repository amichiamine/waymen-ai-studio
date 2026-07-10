import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(6).max(72);

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/account";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch {
      toast.error(t("auth.err.invalid"));
      return;
    }
    setBusy(true);
    if (mode === "signup") {
      await signUp(email, password, { name: fullName });
      toast.success(t("auth.toast.created"));
    } else {
      await signIn(email, password);
      toast.success(t("auth.toast.welcome"));
    }
    setBusy(false);
    navigate(redirectTo, { replace: true });
  };

  const handleForgotPassword = () => {
    try {
      emailSchema.parse(email);
    } catch {
      toast.error(t("auth.err.enterEmail"));
      return;
    }
    toast.success(t("auth.forgot.toast"));
  };

  return (
    <section className="container-page py-16 max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? t("auth.signin") : t("auth.signup")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("auth.subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("auth.fullName")} maxLength={100}
              className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} required
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} required minLength={6}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          <button type="submit" disabled={busy}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50">
            {busy ? "..." : mode === "signin" ? t("auth.submit.in") : t("auth.submit.up")}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground">
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
        </button>

        {mode === "signin" && (
          <button type="button" onClick={handleForgotPassword} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground">
            {t("auth.forgot")}
          </button>
        )}

        <Link to="/" className="block mt-3 text-center text-xs text-muted-foreground hover:text-foreground">{t("auth.back")}</Link>
      </div>
    </section>
  );
}
