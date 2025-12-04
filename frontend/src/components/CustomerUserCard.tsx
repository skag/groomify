import { CustomerUser } from "@/types/customerDetail"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CustomerUserCardProps {
  user: CustomerUser
}

export function CustomerUserCard({ user }: CustomerUserCardProps) {
  return (
    <Card className="border-2">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{user.name}</h3>
              {user.isPrimary && (
                <Badge variant="default" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>
            <p className="text-base">{user.phone}</p>
            <a
              href={`mailto:${user.email}`}
              className="text-base text-blue-600 hover:underline"
            >
              {user.email}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
