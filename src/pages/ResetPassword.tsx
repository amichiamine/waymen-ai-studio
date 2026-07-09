import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { findUserByEmail, setUserPassword } from "@/lib/admin-store";

// Frontend-only : réinitialisation mock validée contre la liste des utilisateurs
// admin. Aucun jeton n'est envoyé par e-mail — l'utilisateur entre son email
// puis le nouveau mot de passe.
const emailSchema = z.string().trim().email("E-mail invalide").max(255);
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(72);

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Données invalides";
      return toast.error(msg ?? "Données invalides");
    }
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");

    const known = findUserByEmail(email);
    if (!known) return toast.error("Aucun compte trouvé avec cet e-mail.");

    setBusy(true);
    setTimeout(() => {
      const ok = setUserPassword(email, password);
      setBusy(false);
      if (!ok) return toast.error("Erreur lors de la mise à jour");
      toast.success("Mot de passe mis à jour. Connectez-vous.");
      navigate("/auth");
    }, 400);
  };

  return (
    <section className="container-page py-16 max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground mb-6">Entrez l'e-mail de votre compte et un nouveau mot de passe.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail du compte" required maxLength={255}
            className="w-full h-11 px-4 rounded-md bg-background border border-border focus:border-primary outline-none text-sm" />
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
