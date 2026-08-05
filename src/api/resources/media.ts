import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import {
  getAdminSnapshot,
  upsertMediaAsset,
  deleteMediaAsset,
  renameMediaAsset,
  type MediaAsset,
} from "@/lib/admin-store";
import type { Paginated } from "../types";

const LS_KEY = "katech.admin.state.v1";

/**
 * Construit un objet MediaAsset à partir d'un fichier en mode mock.
 *
 * ## Divergence base64 / URL (à traiter en phase 4)
 *
 * En mode mock, `MediaAsset.src` est une data:URL base64 produite par
 * `FileReader.readAsDataURL()` et stockée dans le localStorage. En mode http,
 * `MediaAsset.src` est une URL absolue retournée par le backend après upload
 * multipart (`FormData`). Les deux sémantiques sont incompatibles : la valeur
 * de `src` ne peut pas être utilisée de la même façon (téléchargement, CDN,
 * quotas…). Cette divergence est masquée à l'appelant par `upload()` qui
 * accepte un `File` et produit toujours un `MediaAsset` — mais elle persiste
 * dans le stockage sous-jacent. Phase 4 (PLAN.md §8, vague 4.5) doit unifier
 * `src` sur une URL absolue dans les deux modes.
 *
 * ## Protection du quota localStorage
 *
 * `saveState()` d'admin-store avale les erreurs de quota en silence (catch {}
 * vide). Après `upsertMediaAsset()`, on vérifie que l'id est bien présent dans
 * le localStorage. Si la vérification échoue, on supprime l'asset du store et
 * on lance une ApiError explicite — l'erreur n'est jamais avalée (AGENTS.md §7).
 */
async function uploadMock(file: File): Promise<MediaAsset> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier échouée."));
    reader.readAsDataURL(file);
  });

  const asset: MediaAsset = {
    id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    src: dataUrl,
    mime: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  };

  upsertMediaAsset(asset);

  // Vérification que l'écriture a réellement réussi : saveState() avale les
  // erreurs de quota en silence (catch {} vide dans admin-store). Si l'id est
  // absent du localStorage, on rollback et on expose l'erreur.
  const stored = window.localStorage.getItem(LS_KEY);
  if (stored === null || !stored.includes(asset.id)) {
    deleteMediaAsset(asset.id);
    throw new Error(
      `${file.name} : l'image n'a pas pu être sauvegardée (quota localStorage dépassé). ` +
        `Supprimez des médias existants ou attendez la phase 4 (stockage serveur).`,
    );
  }

  return asset;
}

export const mediaApi = {
  async list(): Promise<Paginated<MediaAsset>> {
    if (isHttpMode()) return http.get<Paginated<MediaAsset>>(E.media.list());
    const items = getAdminSnapshot().mediaAssets;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async detail(id: string): Promise<MediaAsset | undefined> {
    if (isHttpMode()) return http.get<MediaAsset>(E.media.list() + `/${id}`);
    return getAdminSnapshot().mediaAssets.find((m) => m.id === id);
  },

  /**
   * Téléverse un fichier.
   *
   * L'appelant fournit toujours un `File` — la divergence base64 (mock) /
   * FormData multipart (http) est entièrement masquée ici.
   */
  async upload(file: File): Promise<MediaAsset> {
    if (isHttpMode()) {
      const fd = new FormData();
      fd.append("file", file);
      return http.upload<MediaAsset>(E.media.upload(), fd);
    }
    return uploadMock(file);
  },

  async rename(id: string, name: string, tag?: string): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.media.remove(id), { name, tag });
      return;
    }
    renameMediaAsset(id, name, tag);
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.media.remove(id));
      return;
    }
    deleteMediaAsset(id);
  },
};
