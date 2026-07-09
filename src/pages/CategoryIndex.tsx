import { Helmet } from "react-helmet-async";
import { CategoryCards } from "@/components/CategoryCards";

export default function CategoryIndex() {
  return (
    <div className="pt-6">
      <Helmet>
        <title>Catégories — KA Tech</title>
        <meta name="description" content="Découvrez toutes les catégories KA Tech : ordinateurs portables, ordinateurs de bureau, PC sur-mesure et smartphones." />
        <link rel="canonical" href="/category" />
      </Helmet>
      <CategoryCards />
    </div>
  );
}
