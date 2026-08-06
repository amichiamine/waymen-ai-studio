import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { resoudreUrlMedia } from "./media-url";

/**
 * Image de catalogue — la SEULE façon d'afficher une URL de média venue des
 * données (produit, catégorie, article, médiathèque).
 *
 * =====================================================================
 * DEUX RESPONSABILITÉS, ET LA SECONDE EST LA PLUS IMPORTANTE
 * =====================================================================
 *  1. Résoudre l'URL selon l'endroit où le site est déposé — voir
 *     `media-url.ts`, qui détaille pourquoi les chemins sont relatifs.
 *
 *  2. **Rendre une image absente VISIBLE.** Dix-neuf URL mortes ont survécu à
 *     tout le développement : ni le typage, ni le lint, ni le build, ni un
 *     coup d'œil à l'accueil ne les ont révélées. La raison est simple — un
 *     `<img>` cassé n'a aucun poids : il occupe sa boîte, ne lève rien, et
 *     ressemble à un produit sans photo. Un catalogue entier peut être
 *     invisible sans qu'une seule alerte se déclenche.
 *
 *     D'où ce repli : un cartouche barré, teinté `destructive`, à la place
 *     exacte de l'image, DOUBLÉ d'un `console.error` nommant l'URL fautive —
 *     que `scripts/parcours.mjs` remonte en anomalie, puisqu'il écoute la
 *     console. L'échec cesse d'être silencieux aux deux bouts : à l'œil du
 *     commerçant et à la sortie du parcours automatisé.
 *
 * Aucune chaîne visible n'est introduite : le repli porte le `alt` déjà
 * localisé par l'appelant (`role="img"` + `aria-label`), rien de plus.
 */

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  /** Chemin tel qu'il est stocké en base, ou URL absolue. */
  src: string | undefined | null;
  /** Texte alternatif, déjà localisé par l'appelant. */
  alt: string;
};

/** URL déjà signalées — une par adresse, pas une par rendu. */
const dejaSignalees = new Set<string>();

function signaler(url: string, alt: string): void {
  if (dejaSignalees.has(url)) return;
  dejaSignalees.add(url);
  console.error(
    `[ka-tech] Image introuvable : « ${url} » (${alt || "sans texte alternatif"}). ` +
      "Les médias du catalogue sont attendus dans « media/ », les fichiers téléversés " +
      "dans « uploads/ », tous deux à la racine du dossier déposé. " +
      "Régénérer le catalogue : bun run scripts/extraire-donnees-front.ts",
  );
}

export function ImageCatalogue({ src, alt, className, ...reste }: Props) {
  const url = resoudreUrlMedia(src);
  const [enEchec, setEnEchec] = useState(false);

  // Une nouvelle URL redevient candidate : sans cette remise à zéro, changer
  // de produit dans une liste garderait le repli du précédent.
  useEffect(() => setEnEchec(false), [url]);

  // Source vide : l'échec est certain, inutile d'attendre le réseau pour le
  // dire. C'est le cas d'une fiche enregistrée sans image.
  if (url === "" || enEchec) {
    return (
      <div
        role="img"
        aria-label={alt}
        title={alt}
        className={`flex items-center justify-center border border-dashed border-destructive/40 bg-destructive/5 text-destructive/70 ${className ?? ""}`}
      >
        <ImageOff className="size-1/4 max-h-10 min-h-4 max-w-10 min-w-4" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        signaler(url, alt);
        setEnEchec(true);
      }}
      {...reste}
    />
  );
}
