import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Headphones, Award } from "lucide-react";

const VALUES = [
  { Icon: ShieldCheck, title: "Garantie officielle", desc: "Tous nos produits sont authentiques et sous garantie des revendeurs agréés." },
  { Icon: Truck, title: "Livraison en Algérie", desc: "Livraison rapide et sécurisée dans les 58 wilayas." },
  { Icon: Headphones, title: "Support dédié", desc: "Notre équipe est disponible avant et après votre achat." },
  { Icon: Award, title: "Expérience et confiance", desc: "Des années au service de milliers de clients satisfaits." },
];

export default function About() {
  useEffect(() => { document.title = `À propos — KA Tech`; }, []);
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-xl border border-border bg-card p-6">
            <v.Icon className="size-8 text-primary mb-3" />
            <h3 className="font-bold text-lg mb-1">{v.title}</h3>
            <p className="text-sm text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </section>

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
