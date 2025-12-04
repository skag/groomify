import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle } from "lucide-react"

interface ServiceAgreementStatusProps {
  isSigned: boolean
  onClick?: () => void
}

export function ServiceAgreementStatus({ isSigned, onClick }: ServiceAgreementStatusProps) {
  return (
    <Button
      variant={isSigned ? "default" : "destructive"}
      className="w-full"
      onClick={onClick}
    >
      {isSigned ? (
        <>
          <CheckCircle className="w-5 h-5 mr-2" />
          Service Agreement
        </>
      ) : (
        <>
          <AlertTriangle className="w-5 h-5 mr-2" />
          Service Agreement
        </>
      )}
    </Button>
  )
}
