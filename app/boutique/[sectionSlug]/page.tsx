import { Shopfront } from "@/app/components/boutique/Shopfront";
import { RequireAuth } from "@/app/components/auth/RequireAuth";
import { initialShopSections } from "@/app/lib/shop-catalog";

export function generateStaticParams() {
  return initialShopSections
    .filter((section) => !["pieces-tiktok", "jeux-video"].includes(section.slug))
    .map((section) => ({ sectionSlug: section.slug }));
}

export default async function ShopSectionPage({ params }: { params: Promise<{ sectionSlug: string }> }) {
  const { sectionSlug } = await params;
  return (
    <RequireAuth>
      <Shopfront sectionSlug={sectionSlug} />
    </RequireAuth>
  );
}
