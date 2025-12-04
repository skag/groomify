import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect Groomify with your favorite tools and services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>
            Connect third-party services to enhance your workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h3 className="font-semibold">Payment Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Connect Stripe or Square for payments
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Coming Soon</Badge>
                <Button variant="outline" disabled>Connect</Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h3 className="font-semibold">Email Marketing</h3>
                <p className="text-sm text-muted-foreground">
                  Sync contacts with Mailchimp
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Coming Soon</Badge>
                <Button variant="outline" disabled>Connect</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
