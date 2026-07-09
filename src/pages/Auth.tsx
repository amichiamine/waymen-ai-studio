import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Version frontend-only : pas d'appel Supabase. Le formulaire crée un
// utilisateur en localStorage pour permettre la navigation.
export const Route = createFileRoute("/auth")({ component: AuthPage });

const emailSchema = z.string().email("E-mail invalide").max(255);
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(72);

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/account" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Données invalides";
      toast.error(msg ?? "Données invalides");
      return;
    }
    setBusy(true);
    if (mode === "signup") {
      await signUp(email, password, { name: fullName });
      toast.success("Compte créé");
    } else {
      await signIn(email, password);
      toast.success("Bienvenue");
    }
    setBusy(false);
    navigate({ to: "/account" });
  };

  const handleForgotPassword = () => {
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Entrez d'abord votre e-mail");
      return;
    }
    toast.success("Si un compte existe, un e-mail de réinitialisation a été envoyé.");
  };

  return (
    <section className="container-page py-16 max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Connexion" : "Créer un compte"}</h1>
        <p className="text-sm text-muted-foreground mb-6">Pour accéder au panier, aux favoris et finaliser votre achat.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" maxLength={100}
              className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" required
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" required minLength={6}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          <button type="submit" disabled={busy}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50">
            {busy ? "..." : mode === "signin" ? "Se connecter" : "Créer un compte"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "Pas encore de compte ? Créez-en un" : "Vous avez un compte ? Connectez-vous"}
        </button>

        {mode === "signin" && (
          <button type="button" onClick={handleForgotPassword} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground">
            Mot de passe oublié ?
          </button>
        )}

        <Link to="/" className="block mt-3 text-center text-xs text-muted-foreground hover:text-foreground">Retour à la boutique</Link>
      </div>
    </section>
  );
}
