import { buildPublicPage } from "@/app/(public-pages)/_lib/buildPublicPage"

const built = buildPublicPage("about")

export const generateMetadata = built.generateMetadata
export default built.Page