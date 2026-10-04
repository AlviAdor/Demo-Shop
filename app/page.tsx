import Campaign from "@/components/Campaign";
import Editorial from "@/components/Editorial";
import Statement from "@/components/Statement";
import Rail from "@/components/Rail";
import Footer from "@/components/Footer";
import { getProducts, toCard } from "@/lib/catalog";

export default function Home() {
  // "New in" is simply the first products in the live catalogue, so it follows whatever is in the database.
  const newIn = getProducts().slice(0, 8).map(toCard);
  return (
    <div>
      <Campaign />
      <Editorial />
      <Statement />
      <Rail title="New in" products={newIn} />
      <Footer />
    </div>
  );
}
