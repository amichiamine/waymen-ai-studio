import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  /** Sous-arbre protégé. */
  children: ReactNode;
  /**
   * Écran de repli personnalisé. Reçoit l'erreur captée et un rappel permettant
   * de retenter le rendu sans recharger la page (utile pour une erreur transitoire,
   * par exemple un chunk `React.lazy` non téléchargé).
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Filet de sécurité du rendu React.
 *
 * Sans lui, la moindre exception levée pendant un rendu démonte tout l'arbre et
 * laisse une page blanche muette en production. On journalise systématiquement
 * l'erreur et sa pile de composants (seule trace exploitable côté client) puis
 * on affiche un repli sobre offrant une porte de sortie à l'utilisateur.
 *
 * Un composant de classe est ici obligatoire : React n'expose pas encore
 * d'équivalent en composant de fonction.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Pas de service de télémétrie dans cette SPA 100 % client : la console est
    // le seul canal de diagnostic disponible. On y pousse la pile de composants,
    // absente de `error.stack`.
    console.error("[ErrorBoundary] Erreur de rendu non capturée :", error);
    console.error("[ErrorBoundary] Pile de composants :", errorInfo.componentStack);
  }

  /** Retente le rendu du sous-arbre sans recharger l'application. */
  private handleReset = (): void => {
    this.setState({ error: null });
  };

  /** Rechargement complet : dernier recours si l'état applicatif est corrompu. */
  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.handleReset);

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <CardTitle className="mt-4 text-xl">Une erreur est survenue</CardTitle>
            <CardDescription>
              Cette page n'a pas pu s'afficher correctement. Vous pouvez réessayer ; si le problème
              persiste, rechargez l'application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Le message brut aide l'utilisateur à décrire l'incident au support. */}
            <p className="rounded-md bg-muted px-3 py-2 text-start font-mono text-xs break-words text-muted-foreground">
              {error.message || error.name}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={this.handleReset} variant="outline">
                <RotateCcw className="me-2 h-4 w-4" /> Réessayer
              </Button>
              <Button onClick={this.handleReload}>Recharger la page</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
