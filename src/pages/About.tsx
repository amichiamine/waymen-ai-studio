import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Headphones, Award, Star, Heart } from "lucide-react";
import { useAdminState, type AboutValue } from "@/lib/admin-store";

const ICONS: Record<AboutValue["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck, truck: Truck, headphones: Headphones,
  award: Award, star: Star, heart: Heart,
};

export default function About() {
  useEffect(() => { document.title = `À propos — KA Tech`; }, []);
  const { aboutValues } = useAdminState();
  return (
    <div className="container-page py-12 lg:py-16">
      <header className="max-w-3xl mb-12">
        <p className="text-sm font-medium text-primary mb-2">À propos</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">KA Tech — La puissance tech entre vos mains</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Nous sommes une boutique spécialisée dans les ordinateurs portables, les ordinateurs de bureau,
          les configurations PC et les smartphones. Notre mission : apporter les dernières technologies
          dans chaque foyer algérien, à des prix compétitifs et avec une vraie garantie.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-2 mb-16">
        <div>
          <h2 className="text-2xl font-bold mb-3">Notre histoire</h2>
          <p className="text-muted-foreground leading-relaxed">
            KA Tech est née d'une vision simple : rendre la technologie moderne accessible à tous.
            Aujourd'hui, nous servons des milliers de clients partout en Algérie et continuons
            d'enrichir notre catalogue avec les produits des meilleures marques mondiales.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-3">Notre mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Offrir à nos clients des produits fiables, un service après-vente irréprochable et un
            véritable accompagnement technique pour une expérience d'achat simple et agréable.
          </p>
        </div>
      </section>

      {aboutValues.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {aboutValues.map((v) => {
            const Icon = ICONS[v.icon] ?? Award;
            return (
              <div key={v.id} className="rounded-xl border border-border bg-card p-6">
                <Icon className="size-8 text-primary mb-3" />
                <h3 className="font-bold text-lg mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.description}</p>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-8 lg:p-12 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold mb-3">Prêt à faire votre choix ?</h2>
        <p className="text-muted-foreground mb-6">Découvrez notre gamme complète de produits tech.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/category" className="inline-flex items-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Parcourir les catégories</Link>
          <Link to="/contact" className="inline-flex items-center h-11 px-6 rounded-md border border-border text-sm font-semibold hover:bg-card">Contactez-nous</Link>
        </div>
      </section>
    </div>
  );
}
