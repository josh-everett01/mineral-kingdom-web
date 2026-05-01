import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { OpenBoxClient } from "@/components/open-box/OpenBoxClient"
import { Container } from "@/components/site/Container"

export default function OpenBoxPage() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10" data-testid="open-box-page-shell">
        <div className="mx-auto max-w-4xl">
          <ProtectedPage>
            <OpenBoxClient />
          </ProtectedPage>
        </div>
      </Container>
    </div>
  )
}