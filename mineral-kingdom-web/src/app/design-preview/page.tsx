import type { Metadata } from "next"

import { MineralKingdomPreview } from "@/components/design-preview/MineralKingdomPreview"

export const metadata: Metadata = {
  title: "Design Preview | Mineral Kingdom",
  description: "Mineral Kingdom psychedelic luxury storefront design preview.",
}

export default function DesignPreviewPage() {
  return <MineralKingdomPreview />
}
