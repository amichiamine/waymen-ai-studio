import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

/**
 * Boîte de confirmation partagée par tous les écrans admin.
 *
 * `confirmLabel` / `cancelLabel` restent optionnels : à défaut, ils prennent
 * les libellés traduits `admin.socle.confirmation.*`. Les valeurs par défaut
 * sont donc résolues DANS le composant et non dans la signature, car un défaut
 * de paramètre est évalué avant tout accès au contexte de langue.
 * Les appelants qui passent un libellé explicite doivent le faire déjà traduit.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  const libelleConfirmer = confirmLabel ?? t("admin.socle.confirmation.confirmer");
  const libelleAnnuler = cancelLabel ?? t("admin.socle.confirmation.annuler");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{libelleAnnuler}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {libelleConfirmer}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
