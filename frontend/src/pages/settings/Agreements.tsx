import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import RichTextEditor from "@/components/RichTextEditor"
import { agreementService } from "@/services/agreementService"
import { toast } from "sonner"
import type { Agreement, SigningOption, AgreementStatus } from "@/types/agreement"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AgreementsSettings() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [agreementTitle, setAgreementTitle] = useState("")
  const [agreementContent, setAgreementContent] = useState("")
  const [signOption, setSignOption] = useState<SigningOption>("once")
  const [status, setStatus] = useState<AgreementStatus>("active")
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreements, setAgreements] = useState<Agreement[]>([])

  // Fetch agreements on component mount
  useEffect(() => {
    fetchAgreements()
  }, [])

  const fetchAgreements = async () => {
    try {
      setLoading(true)
      const data = await agreementService.getAllAgreements()
      setAgreements(data)
    } catch (error) {
      console.error("Failed to fetch agreements:", error)
      toast.error("Failed to load agreements")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAgreement = async () => {
    if (!agreementTitle || !agreementContent) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)

      if (isEditMode && editingId) {
        // Update existing agreement
        await agreementService.updateAgreement(editingId, {
          name: agreementTitle,
          content: agreementContent,
          signing_option: signOption,
          status: status,
        })
        toast.success("Agreement updated successfully")
      } else {
        // Create new agreement
        await agreementService.createAgreement({
          name: agreementTitle,
          content: agreementContent,
          signing_option: signOption,
          status: status,
        })
        toast.success("Agreement created successfully")
      }

      // Refresh the list
      await fetchAgreements()

      // Reset form
      resetForm()
      setIsAddModalOpen(false)
    } catch (error) {
      console.error("Failed to save agreement:", error)
      toast.error(isEditMode ? "Failed to update agreement" : "Failed to create agreement")
    } finally {
      setLoading(false)
    }
  }

  const handleEditAgreement = (agreement: Agreement) => {
    setIsEditMode(true)
    setEditingId(agreement.id)
    setAgreementTitle(agreement.name)
    setAgreementContent(agreement.content)
    setSignOption(agreement.signing_option)
    setStatus(agreement.status)
    setIsAddModalOpen(true)
  }

  const handleDeleteAgreement = async (id: number) => {
    if (!confirm("Are you sure you want to delete this agreement?")) {
      return
    }

    try {
      setLoading(true)
      await agreementService.deleteAgreement(id)
      toast.success("Agreement deleted successfully")
      await fetchAgreements()
    } catch (error) {
      console.error("Failed to delete agreement:", error)
      toast.error("Failed to delete agreement")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAgreementTitle("")
    setAgreementContent("")
    setSignOption("once")
    setStatus("active")
    setShowPreview(false)
    setIsEditMode(false)
    setEditingId(null)
  }

  const handleModalClose = (open: boolean) => {
    setIsAddModalOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSignOptionLabel = (option: SigningOption) => {
    const labels: Record<SigningOption, string> = {
      'once': 'Sign Once',
      'every': 'Sign on Every Booking',
      'manual': 'Manual Send'
    }
    return labels[option]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Agreements</h1>
          <p className="text-muted-foreground mt-2">
            Manage service agreements and terms
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agreement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agreement Templates</CardTitle>
          <CardDescription>
            Create and manage service agreement templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && agreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Loading agreements...</div>
          ) : agreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agreements yet. Create your first agreement to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agreement Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Edited</TableHead>
                  <TableHead>Sign Option</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{agreement.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          agreement.status === "active" ? "default" :
                          agreement.status === "draft" ? "secondary" :
                          "outline"
                        }
                      >
                        {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(agreement.created_at)}</TableCell>
                    <TableCell>{formatDate(agreement.updated_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getSignOptionLabel(agreement.signing_option)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAgreement(agreement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAgreement(agreement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Agreement Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit" : "Create"} Service Agreement</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the" : "Create a new"} service agreement template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Agreement Title */}
            <div className="space-y-2">
              <Label htmlFor="agreementTitle" className="text-base">
                <span className="text-red-500">* </span>Agreement title
              </Label>
              <Input
                id="agreementTitle"
                value={agreementTitle}
                onChange={(e) => setAgreementTitle(e.target.value)}
                placeholder="Service Agreement"
                className="text-base"
              />
            </div>

            {/* Agreement Content */}
            <div className="space-y-2">
              <Label htmlFor="agreementContent" className="text-base">
                <span className="text-red-500">* </span>Agreement content
              </Label>

              {showPreview ? (
                <div className="border rounded-lg p-4 min-h-[300px] bg-muted/50">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {agreementContent}
                  </div>
                </div>
              ) : (
                <RichTextEditor
                  content={agreementContent}
                  onChange={setAgreementContent}
                  placeholder="Enter agreement content..."
                />
              )}
            </div>

            {/* When is this agreement required? */}
            <div className="space-y-3">
              <Label className="text-base">
                <span className="text-red-500">* </span>When is this agreement required?
              </Label>
              <RadioGroup value={signOption} onValueChange={(value) => setSignOption(value as SigningOption)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="once" id="once" />
                  <Label htmlFor="once" className="font-normal cursor-pointer">
                    Sign once
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="every" id="every" />
                  <Label htmlFor="every" className="font-normal cursor-pointer">
                    Sign on every booking
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="font-normal cursor-pointer">
                    Not required, I will send manually
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Agreement Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-base">
                <span className="text-red-500">* </span>Status
              </Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AgreementStatus)}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Active agreements are available for use. Draft agreements are works in progress.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                disabled={loading}
              >
                {showPreview ? "Edit" : "Preview"}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModalClose(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveAgreement} disabled={loading}>
                  {loading ? "Saving..." : isEditMode ? "Update Agreement" : "Save Agreement"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
