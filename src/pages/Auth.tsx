import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { ZodError } from "zod";
import { toApiError } from "@/data-provider";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { emailSchema, passwordSchema } from "@/lib/auth-schemas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  // Purge de sécurité du mot de passe au démontage du composant
  useEffect(() => {
    return () => {
      setPassword("");
    };
  }, []);

  /**
   * Traduit une ZodError en message i18n précis.
   * Le serveur fait autorité sur les règles ; ici on ne valide que pour guider
   * l'utilisateur AVANT l'appel réseau, avec le même vocabulaire que l'API.
   */
  const traduireErreur = (err: ZodError): string => {
    const first = err.errors[0];
    if (!first) return t("auth.err.invalid");

    // emailSchema : le message du refine vaut "email"
    if (first.message === "email") return t("auth.err.email");

    // passwordSchema : messages "tooShort" / "tooLong"
    if (first.message === "tooShort") return t("auth.err.pw.tooShort");
    if (first.message === "tooLong") return t("auth.err.pw.tooLong");

    // Zod built-ins (too_small, too_big) pour les limites de longueur
    if (first.code === "too_small") return t("auth.err.pw.tooShort");
    if (first.code === "too_big") return t("auth.err.pw.tooLong");

    return t("auth.err.invalid");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Normalisation identique au serveur : trim + minuscules sur l'e-mail.
    const normalizedEmail = email.trim().toLowerCase();

    try {
      emailSchema.parse(normalizedEmail);
    } catch (err) {
      toast.error(err instanceof ZodError ? traduireErreur(err) : t("auth.err.email"));
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (err) {
      toast.error(err instanceof ZodError ? traduireErreur(err) : t("auth.err.pw.tooShort"));
      return;
    }

    setBusy(true);
    try {
      // Le retour du contexte PORTE le refus (`{ error: { message } }`) : l'ignorer
      // rendait un mot de passe faux totalement muet — ni message, ni retour
      // visuel — pendant qu'une `ApiError` non attrapée filait dans la console.
      // Un refus doit se voir, et ne doit surtout pas être suivi d'une
      // redirection ni d'un toast de succès.
      const { error } = await (mode === "signup"
        ? signUp(normalizedEmail, password, { name: fullName })
        : signIn(normalizedEmail, password));

      if (error) {
        toast.error(error.message);
        return;
      }

      // Purge immédiate de la mémoire locale dès le succès d'authentification
      setPassword("");

      toast.success(t(mode === "signup" ? "auth.toast.created" : "auth.toast.welcome"));
      navigate(redirectTo, { replace: true });
    } catch (cause) {
      // Filet : le fournisseur traduit déjà refus et panne en `error.message`.
      // Ce qui arrive ici est imprévu — visible plutôt que silencieux.
      toast.error(toApiError(cause).message);
    } finally {
      setBusy(false);
    }
  };

  const isEmailValid = useMemo(() => {
    const trimmed = email.trim().toLowerCase();
    return trimmed.length > 0 && emailSchema.safeParse(trimmed).success;
  }, [email]);

  const isPasswordValid = useMemo(() => {
    return password.length >= 10;
  }, [password]);

  const isNameValid = useMemo(() => {
    return mode === "signin" || fullName.trim().length >= 2;
  }, [mode, fullName]);

  const isFormValid = isEmailValid && isPasswordValid && isNameValid;

  const handleForgotPassword = () => {
    setForgotOpen(true);
  };

  return (
    <section className="container-page py-16 max-w-md">
      <Helmet>
        <title>{mode === "signin" ? t("auth.page.title") : t("auth.signup")}</title>
        <meta name="description" content={t("auth.subtitle")} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold mb-1">
          {mode === "signin" ? t("auth.signin") : t("auth.signup")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{t("auth.subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <input
                id="auth-name"
                name="name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("auth.fullName")}
                maxLength={100}
                className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm"
              />
              {fullName.length > 0 && fullName.trim().length < 2 && (
                <p className="mt-1 text-xs text-amber-500">2 caractères minimum</p>
              )}
            </div>
          )}
          <div>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email")}
              required
              className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm"
            />
            {email.length > 0 && !isEmailValid && email.includes("@") && (
              <p className="mt-1 text-xs text-destructive">{t("auth.err.email")}</p>
            )}
          </div>
          <div>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password")}
              required
              minLength={10}
              className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm"
            />
            {password.length > 0 && password.length < 10 && (
              <p className="mt-1 text-xs text-amber-500">
                {t("auth.err.pw.tooShort")} ({password.length}/10)
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={busy || !isFormValid}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "..." : mode === "signin" ? t("auth.submit.in") : t("auth.submit.up")}
          </button>
        </form>

        <button
          onClick={() => {
            setPassword("");
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
        </button>

        {mode === "signin" && (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {t("auth.forgot")}
          </button>
        )}

        <Link
          to="/"
          className="block mt-3 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {t("auth.back")}
        </Link>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.forgot.dialog_title")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("auth.forgot.instructions")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <p className="font-medium text-foreground">
                {t("auth.email")} :{" "}
                <span className="font-mono text-primary">{email.trim() || "—"}</span>
              </p>
              <p className="text-xs text-muted-foreground">{t("auth.forgot.admin_tip")}</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              {t("admin.socle.confirmation.annuler")}
            </Button>
            <Button asChild>
              <Link to="/contact" onClick={() => setForgotOpen(false)}>
                {t("auth.forgot.contact_btn")}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
