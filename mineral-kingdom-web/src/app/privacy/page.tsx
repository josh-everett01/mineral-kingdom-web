import { buildPublicPage } from "@/app/(public-pages)/_lib/buildPublicPage"

const built = buildPublicPage("privacy")

export const generateMetadata = built.generateMetadata
export default built.Page