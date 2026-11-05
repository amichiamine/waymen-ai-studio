import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSiteSettings,
  useSiteSettingsMutations,
  useSiteContent,
  useSiteContentMutations,
  useProductList,
  useProductMutations,
  useMediaAssetList,
} from "@/data-provider";
import { appliquerBrandingDynamique } from "@/data-provider/site-settings";
import {
  Store,
  Palette,
  Phone,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Laptop,
  ShoppingBag,
  Shirt,
  Heart,
  Wrench,
  Trash2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { ImageCatalogue } from "@/components/ImageCatalogue";

export type PresetSector = "tech" | "general" | "fashion" | "beauty" | "services";

const PRESET_SECTORS: {
  id: PresetSector;
  title: string;
  desc: string;
  color: string;
  builder: boolean;
  icon: typeof Laptop;
  slogan: string;
}[] = [
  {
    id: "tech",
    title: "High-Tech & Informatique",
    desc: "Ordinateurs, smartphones, composants et accessoires électroniques.",
    color: "#0284c7",
    builder: true,
    icon: Laptop,
    slogan: "La puissance technologique et le matériel de pointe entre vos mains.",
  },
  {
    id: "general",
    title: "Commerce Général & Bazar",
    desc: "Boutique multi-rayons, électroménager, maison et articles du quotidien.",
    color: "#f97316",
    builder: false,
    icon: ShoppingBag,
    slogan: "Tous vos produits du quotidien et bonnes affaires au meilleur prix.",
  },
  {
    id: "fashion",
    title: "Mode, Vêtements & Textile",
    desc: "Prêt-à-porter, chaussures, maroquinerie et accessoires tendance.",
    color: "#7c3aed",
    builder: false,
    icon: Shirt,
    slogan: "Tendances, style et élégance pour sublimer votre garde-robe.",
  },
  {
    id: "beauty",
    title: "Beauté, Cosmétiques & Bien-être",
    desc: "Parfums, maquillage, soins corporels et bien-être naturel.",
    color: "#10b981",
    builder: false,
    icon: Heart,
    slogan: "Révélez votre éclat naturel avec nos soins et cosmétiques d'exception.",
  },
  {
    id: "services",
    title: "Prestations de Services & Conseils",
    desc: "Formations, réparations, assistance, agences et travail immatériel.",
    color: "#2563eb",
    builder: false,
    icon: Wrench,
    slogan: "Expertise, accompagnement personnalisé et solutions professionnelles sur mesure.",
  },
];

const PRESET_COLORS = [
  { label: "Bleu Tech", hex: "#0284c7" },
  { label: "Émeraude", hex: "#10b981" },
  { label: "Violet Royal", hex: "#7c3aed" },
  { label: "Orange Solaire", hex: "#f97316" },
  { label: "Rouge Sport", hex: "#e11d48" },
  { label: "Anthracite", hex: "#475569" },
];

export function SetupWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { data: siteSettings } = useSiteSettings();
  const { update: updateSettings } = useSiteSettingsMutations();
  const { data: siteContent } = useSiteContent();
  const { update: updateContent } = useSiteContentMutations();
  const { data: products } = useProductList();
  const { remove: removeProduct } = useProductMutations();
  const { data: mediaAssets } = useMediaAssetList();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState(siteSettings.storeName || "");
  const [slogan, setSlogan] = useState(siteSettings.promoBannerText || "");
  const [logoUrl, setLogoUrl] = useState(siteSettings.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(siteSettings.faviconUrl || "");
  const [defaultTheme, setDefaultTheme] = useState<"dark" | "light" | "system">(
    siteSettings.defaultTheme || "dark",
  );
  const [primaryColor, setPrimaryColor] = useState(siteSettings.primaryColor || "#0284c7");
  const [contactEmail, setContactEmail] = useState(siteSettings.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(siteSettings.contactPhone || "");
  const [whatsapp, setWhatsapp] = useState(siteSettings.whatsapp || "");
  const [address, setAddress] = useState(siteSettings.address || "");
  const [currencySymbol, setCurrencySymbol] = useState(siteSettings.currencySymbol || "DA");
  const [builderEnabled, setBuilderEnabled] = useState(siteSettings.builderEnabled ?? true);
  const [selectedSector, setSelectedSector] = useState<PresetSector>("tech");
  const [purgeDemoProducts, setPurgeDemoProducts] = useState(false);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (open) {
      setStep(1);
      setStoreName(siteSettings.storeName || "");
      setSlogan(siteSettings.promoBannerText || "");
      setLogoUrl(siteSettings.logoUrl || "");
      setFaviconUrl(siteSettings.faviconUrl || "");
      setDefaultTheme(siteSettings.defaultTheme || "dark");
      setPrimaryColor(siteSettings.primaryColor || "#0284c7");
      setContactEmail(siteSettings.contactEmail || "");
      setContactPhone(siteSettings.contactPhone || "");
      setWhatsapp(siteSettings.whatsapp || "");
      setAddress(siteSettings.address || "");
      setCurrencySymbol(siteSettings.currencySymbol || "DA");
      setBuilderEnabled(siteSettings.builderEnabled ?? true);
    }
  }, [open, siteSettings]);

  const handleSectorSelect = (sector: PresetSector) => {
    setSelectedSector(sector);
    const p = PRESET_SECTORS.find((s) => s.id === sector);
    if (p) {
      setBuilderEnabled(p.builder);
      setPrimaryColor(p.color);
      setSlogan(p.slogan);
      appliquerBrandingDynamique({ primaryColor: p.color, defaultTheme });
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Mise à jour des paramètres du site
      await updateSettings({
        ...siteSettings,
        storeName: storeName.trim() || "Ma Boutique",
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
        currencySymbol: currencySymbol.trim() || "DA",
        defaultTheme,
        primaryColor,
        logoUrl,
        faviconUrl,
        builderEnabled,
        onboardingCompleted: true,
      });

      // 2. Mise à jour du contenu éditorial si slogan personnalisé
      if (slogan.trim() && siteContent) {
        const prevSub = siteContent.hero?.subtitle;
        const subObj =
          typeof prevSub === "object" && prevSub !== null
            ? prevSub
            : { fr: String(prevSub || ""), en: String(prevSub || ""), ar: String(prevSub || "") };

        await updateContent({
          ...siteContent,
          hero: {
            ...siteContent.hero,
            subtitle: {
              ...subObj,
              fr: slogan.trim(),
            },
          },
          whyUs: {
            ...siteContent.whyUs,
            kicker: {
              fr: `Pourquoi ${storeName.trim() || "nous choisir"}`,
              en: `Why choose ${storeName.trim() || "us"}`,
              ar: `لماذا تختار ${storeName.trim() || "متجرنا"}`,
            },
          },
        });
      }

      // 3. Purge éventuelle du catalogue démo
      if (purgeDemoProducts) {
        if (products && products.length > 0) {
          for (const prod of products) {
            try {
              await removeProduct(prod.id);
            } catch {
              // poursuite
            }
          }
        }
        toast.info("Catalogue démo réinitialisé à 0 article.");
      }

      // 4. Application visuelle immédiate
      appliquerBrandingDynamique({ primaryColor, defaultTheme, faviconUrl });

      toast.success(
        `🎉 Félicitations ! Votre boutique "${storeName || "Ma Boutique"}" est configurée et prête.`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        `Erreur lors de la sauvegarde : ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0 sm:rounded-2xl border-border bg-card">
        {/* En-tête avec indicateur de progression */}
        <div className="border-b border-border bg-muted/30 p-6">
          <DialogHeader className="text-start">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Assistant d'Installation & Personnalisation
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Configurez votre plateforme Marque Blanche en 4 étapes simples et rapides.
                  </DialogDescription>
                </div>
              </div>
              <div className="text-end">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Étape {step} sur 4
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Stepper visuel */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { n: 1, label: "Identité", icon: Store },
              { n: 2, label: "Coordonnées", icon: Phone },
              { n: 3, label: "Profil Métier", icon: LayoutGrid },
              { n: 4, label: "Catalogue Démo", icon: CheckCircle2 },
            ].map((s) => {
              const Icon = s.icon;
              const active = step === s.n;
              const done = step > s.n;
              return (
                <div key={s.n} className="flex flex-col gap-1.5">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                      done ? "bg-primary" : active ? "bg-primary/80" : "bg-muted"
                    }`}
                  />
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium ${
                      active
                        ? "text-primary font-semibold"
                        : done
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Corps des étapes */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {/* ÉTAPE 1 : IDENTITÉ & MARQUE */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wiz-store-name" className="text-sm font-semibold">
                    Nom de votre enseigne / boutique *
                  </Label>
                  <Input
                    id="wiz-store-name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex : Boutique Prestige, Tech Express, Studio Mode..."
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    S'affichera dans l'en-tête, le titre du site, les e-mails et mentions légales.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wiz-slogan" className="text-sm font-semibold">
                    Slogan commercial ou accroche
                  </Label>
                  <Input
                    id="wiz-slogan"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ex : La qualité et le style au meilleur prix."
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sera mis en avant dans la bannière de la vitrine et le sous-titre d'accueil.
                  </p>
                </div>
              </div>

              {/* Logo & Favicon */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Logo de la boutique</Label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="URL ou chemin du logo (/uploads/logo.webp)"
                    className="h-9"
                  />
                  {mediaAssets.length > 0 && (
                    <div className="flex gap-2 items-center flex-wrap pt-1">
                      <span className="text-[11px] text-muted-foreground">Médiathèque :</span>
                      {mediaAssets.slice(0, 3).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLogoUrl(m.src)}
                          className="text-[11px] px-2 py-0.5 rounded border border-border hover:border-primary bg-muted/50"
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {logoUrl && (
                    <div className="h-12 w-36 rounded border border-border bg-muted/40 p-1 flex items-center justify-center overflow-hidden">
                      <ImageCatalogue
                        src={logoUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Favicon du navigateur</Label>
                  <Input
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="URL de l'icône favicon (.ico, .png, .svg)"
                    className="h-9"
                  />
                  {faviconUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="size-8 rounded border border-border bg-background p-1 flex items-center justify-center">
                        <img src={faviconUrl} alt="Favicon" className="size-5 object-contain" />
                      </div>
                      <span className="text-xs text-muted-foreground">Aperçu dans l'onglet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thème & Couleur primaire */}
              <div className="border-t border-border/80 pt-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Mode d'affichage initial</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "dark", label: "Sombre", icon: Moon },
                        { id: "light", label: "Clair", icon: Sun },
                        { id: "system", label: "Système", icon: Monitor },
                      ].map((th) => {
                        const Icon = th.icon;
                        const isSel = defaultTheme === th.id;
                        return (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => setDefaultTheme(th.id as "dark" | "light" | "system")}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                              isSel
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                : "border-border hover:border-primary/50 text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-4" />
                            {th.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Couleur d'accentuation (Branding)
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          appliquerBrandingDynamique({ primaryColor: e.target.value });
                        }}
                        className="size-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value)) {
                            appliquerBrandingDynamique({ primaryColor: e.target.value });
                          }
                        }}
                        className="h-10 font-mono text-sm uppercase"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(c.hex);
                            appliquerBrandingDynamique({ primaryColor: c.hex });
                          }}
                          className="size-6 rounded-full border border-border/80 transition-transform hover:scale-110"
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : COORDONNÉES & CONTACT */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wiz-email" className="text-sm font-semibold">
                    Email de contact officiel
                  </Label>
                  <Input
                    id="wiz-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@votre-domaine.com"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wiz-phone" className="text-sm font-semibold">
                    Numéro de téléphone commercial
                  </Label>
                  <Input
                    id="wiz-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+213 555 00 00 00"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="wiz-wa" className="text-sm font-semibold">
                    Numéro WhatsApp client (sans espace)
                  </Label>
                  <Input
                    id="wiz-wa"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="213555000000"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wiz-cur" className="text-sm font-semibold">
                    Devise monétaire affichée
                  </Label>
                  <Input
                    id="wiz-cur"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="DA, €, $, DZD..."
                    className="h-10 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="wiz-addr" className="text-sm font-semibold">
                  Adresse de la boutique ou siège
                </Label>
                <Input
                  id="wiz-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex : Alger Centre, Didouche Mourad, Alger"
                  className="h-10"
                />
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : PROFIL MÉTIER & MODULES */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <h3 className="text-sm font-semibold mb-1">
                  Sélectionnez le secteur d'activité de votre plateforme
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ce choix adapte automatiquement la palette, le slogan et active/désactive les
                  modules spécialisés.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {PRESET_SECTORS.map((sec) => {
                  const Icon = sec.icon;
                  const isSel = selectedSector === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSectorSelect(sec.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-start transition-all ${
                        isSel
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <div
                        className="size-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${sec.color}20`, color: sec.color }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-sm text-foreground truncate">
                            {sec.title}
                          </span>
                          {isSel && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {sec.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Contrôle du configurateur PC */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center justify-between gap-4 mt-2">
                <div>
                  <h4 className="text-sm font-semibold">Configurateur PC sur mesure (Builder)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {builderEnabled
                      ? "Activé : disponible dans l'en-tête, la vitrine et l'URL /builder."
                      : "Désactivé : masqué de la vitrine (recommandé hors boutiques informatiques)."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">
                    {builderEnabled ? "Actif" : "Inactif"}
                  </span>
                  <input
                    type="checkbox"
                    checked={builderEnabled}
                    onChange={(e) => setBuilderEnabled(e.target.checked)}
                    className="size-5 accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : CATALOGUE DÉMO & VALIDATION */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CheckCircle2 className="size-5" />
                  <span>Tout est presque prêt !</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Votre enseigne <strong>"{storeName || "Ma Boutique"}"</strong> est prête à être
                  initialisée avec le thème{" "}
                  {defaultTheme === "dark"
                    ? "Sombre"
                    : defaultTheme === "light"
                      ? "Clair"
                      : "Automatique"}{" "}
                  et la devise {currencySymbol}.
                </p>
              </div>

              {/* Choix des données démo */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Trash2 className="size-4 text-muted-foreground" />
                  Gestion des articles de démonstration
                </h4>
                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="radio"
                      name="purge_choice"
                      checked={!purgeDemoProducts}
                      onChange={() => setPurgeDemoProducts(false)}
                      className="size-4 accent-primary mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-semibold">
                        Conserver les 12 articles démo existants
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Idéal pour tester les fonctionnalités, le panier et la recherche avant de
                        saisir vos vrais produits.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="radio"
                      name="purge_choice"
                      checked={purgeDemoProducts}
                      onChange={() => setPurgeDemoProducts(true)}
                      className="size-4 accent-primary mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-semibold text-destructive">
                        Vider le catalogue démo (Démarrer à zéro)
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Supprime les 12 ordinateurs/téléphones démo pour démarrer sur une boutique
                        propre et vierge.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied d'action */}
        <div className="border-t border-border bg-muted/20 p-4 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Précédent
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Passer pour le moment
            </Button>
          )}

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="gap-1.5"
              >
                Suivant
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleFinish}
                disabled={saving}
                className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-md"
              >
                {saving ? "Initialisation..." : "Lancer ma boutique"}
                <Sparkles className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
