import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminCMSPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CMS</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          CMS workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}