import { useEffect } from "react";

import { CategoryCards } from "@/components/CategoryCards";

export default function CategoryIndex() {
  useEffect(() => { document.title = `Catégories — KA Tech`; }, []);
  return (
    <div className="pt-6">
      <CategoryCards />
    </div>
  );
}
