import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

// Frontend-only : pas de vérification de token, formulaire cosmétique.
export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      toast.success("Mot de passe mis à jour. Connectez-vous.");
      navigate({ to: "/auth" });
    }, 600);
  };

  return (
    <section className="container-page py-16 max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground mb-6">Définissez un nouveau mot de passe pour votre compte.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" required minLength={6} maxLength={72}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" required minLength={6} maxLength={72}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
          <button type="submit" disabled={busy}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50">
            {busy ? "..." : "Mettre à jour le mot de passe"}
          </button>
        </form>

        <Link to="/auth" className="block mt-4 text-center text-xs text-muted-foreground hover:text-foreground">
          Retour à la connexion
        </Link>
      </div>
    </section>
  );
}
