import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  useEffect(() => { document.title = `Commande confirmée — KA Tech`; }, []);
  return (
    <div className="container mx-auto max-w-xl px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Merci pour votre commande !</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Votre demande a bien été enregistrée. Notre équipe vous contactera très prochainement
        pour confirmer les détails de livraison.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/account"><Button variant="outline">Mon compte</Button></Link>
        <Link to="/"><Button>Retour à l'accueil</Button></Link>
      </div>
    </div>
  );
}
