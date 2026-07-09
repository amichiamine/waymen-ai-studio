import { createFileRoute } from "@tanstack/react-router";
import { CategoryCards } from "@/components/CategoryCards";

export const Route = createFileRoute("/category/")({
  head: () => ({
    meta: [
      { title: "Catégories — KA Tech" },
      { name: "description", content: "Parcourez toutes les catégories KA Tech : portables, bureau, configurations et smartphones." },
      { property: "og:title", content: "Catégories — KA Tech" },
      { property: "og:description", content: "Toutes les catégories de produits KA Tech." },
      { property: "og:url", content: "/category" },
    ],
    links: [{ rel: "canonical", href: "/category" }],
  }),
  component: CategoryIndex,
});

function CategoryIndex() {
  return (
    <div className="pt-6">
      <CategoryCards />
    </div>
  );
}
