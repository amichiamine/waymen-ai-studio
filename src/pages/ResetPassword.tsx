import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6).max(72);

/** Latence simulée du parcours mock — conservée à l'identique. */
const SUBMIT_DELAY_MS = 400;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { resetPassword } = useAuth();
  // Lien de réinitialisation reçu par courriel (`/reset-password?token=…`).
  // Ignoré par le parcours mock, requis par le backend de la phase 4.
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch {
      return toast.error(t("auth.err.invalid"));
    }
    if (password !== confirm) return toast.error(t("reset.err.match"));

    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));
    try {
      const outcome = await resetPassword({ email, password, token });
      if (!outcome.ok) {
        // En http, le fournisseur fournit un message précis (jeton expiré,
        // service injoignable) que `reason` seul ne peut pas porter : on le
        // préfère. En mock il est absent et la traduction reprend la main.
        return toast.error(
          outcome.message ??
            (outcome.reason === "no-account" ? t("reset.err.noAccount") : t("reset.err.update")),
        );
      }
      toast.success(t("reset.ok"));
      navigate("/auth");
    } catch {
      // Jeton absent ou refusé côté serveur — échec visible (AGENTS.md §7).
      toast.error(t("reset.err.update"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container-page py-16 max-w-md">
      <Helmet>
        <title>{t("reset.page.title")}</title>
        <meta name="description" content={t("reset.page.desc")} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold mb-1">{t("reset.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("reset.subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("reset.email")}
            required
            maxLength={255}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("reset.newpw")}
            required
            minLength={6}
            maxLength={72}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("reset.confirm")}
            required
            minLength={6}
            maxLength={72}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {busy ? "..." : t("reset.submit")}
          </button>
        </form>

        <Link
          to="/auth"
          className="block mt-4 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {t("reset.back")}
        </Link>
      </div>
    </section>
  );
}
