import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { staffService } from "@/services/staffService"
import { toast } from "sonner"
import type { StaffMember, StaffRole, CreateStaffRequest, UpdateStaffRequest } from "@/types/staff"

export default function StaffSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "" as StaffRole | "",
    startDate: "",
    password: "",
  })

  // Fetch staff on component mount
  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const data = await staffService.getAllStaff()
      setStaffMembers(data)
    } catch (error: any) {
      console.error("Error fetching staff:", error)
      toast.error(error.message || "Failed to load staff members")
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      startDate: "",
      password: "",
    })
    setEditingStaff(null)
  }

  const openAddModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member)
    setFormData({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      phone: member.phone || "",
      role: member.role,
      startDate: member.start_date ? member.start_date.split('T')[0] : "",
      password: "", // Don't populate password
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)

    try {
      if (editingStaff) {
        // Update existing staff
        const updateData: UpdateStaffRequest = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone.trim() || undefined,
          role: formData.role as StaffRole,
          start_date: formData.startDate || undefined,
        }

        // Only include password if provided and not empty
        if (formData.password && formData.password.trim()) {
          updateData.password = formData.password.trim()
        }

        await staffService.updateStaff(editingStaff.id, updateData)
        toast.success("Staff member updated successfully")
      } else {
        // Create new staff
        const createData: CreateStaffRequest = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone.trim() || undefined,
          role: formData.role as StaffRole,
          start_date: formData.startDate || undefined,
        }

        // Only include password if it's provided and not empty
        if (formData.password && formData.password.trim()) {
          createData.password = formData.password.trim()
        }

        await staffService.createStaff(createData)
        toast.success("Staff member added successfully")
      }

      // Refresh the list
      await fetchStaff()
      setIsModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Error saving staff:", error)
      toast.error(error.message || "Failed to save staff member")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (member: StaffMember) => {
    if (member.role === "owner") {
      toast.error("Cannot delete business owner")
      return
    }

    if (!confirm(`Are you sure you want to remove ${member.first_name} ${member.last_name}?`)) {
      return
    }

    setIsDeleting(true)

    try {
      await staffService.deleteStaff(member.id)
      toast.success("Staff member removed successfully")
      await fetchStaff()
    } catch (error: any) {
      console.error("Error deleting staff:", error)
      toast.error(error.message || "Failed to remove staff member")
    } finally {
      setIsDeleting(false)
    }
  }

  const getRoleBadgeColor = (role: StaffRole) => {
    const colors = {
      owner: "bg-purple-100 text-purple-800 border-purple-300",
      staff: "bg-blue-100 text-blue-800 border-blue-300",
      groomer: "bg-green-100 text-green-800 border-green-300",
    }
    return colors[role]
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their permissions
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {staffMembers.filter(m => m.role !== "groomer").length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No staff members found. Add your first team member to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {staffMembers.filter(m => m.role !== "groomer").map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold">
                  {member.first_name} {member.last_name}
                </h3>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>{member.email}</span>
                  {member.phone && <span>{member.phone}</span>}
                  <span>Started: {formatDate(member.start_date)}</span>
                  <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs ${
                    member.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {member.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getRoleBadgeColor(member.role)}`}
                >
                  {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Unknown'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(member)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {member.role !== "owner" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(member)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add Staff"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Update the staff member's information"
                : "Add a new staff member to your team. For groomers, use the Groomers section."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingStaff ? "" : "(Optional)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingStaff ? "Leave blank to keep current password" : "Optional - for full account access"}
              />
              <p className="text-xs text-muted-foreground">
                {editingStaff
                  ? "Only enter a password if you want to change it"
                  : "Staff can use PIN for POS access or password for full account login"
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as StaffRole })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    {/* Only show groomer option when editing an existing groomer */}
                    {editingStaff?.role === "groomer" && (
                      <SelectItem value="groomer">Groomer</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : (editingStaff ? "Update" : "Add Staff")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
