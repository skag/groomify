import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { staffService } from "@/services/staffService"
import { toast } from "sonner"
import type { StaffMember } from "@/types/staff"

export default function GroomersSettings() {
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])

  // Fetch staff on component mount
  useEffect(() => {
    fetchGroomers()
  }, [])

  const fetchGroomers = async () => {
    try {
      const data = await staffService.getAllStaff()
      setStaffMembers(data)
    } catch (error: any) {
      console.error("Error fetching groomers:", error)
      toast.error(error.message || "Failed to load groomers")
    }
  }

  // Filter to only show groomers
  const groomers = staffMembers.filter(m => m.role === "groomer")

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`Are you sure you want to remove ${member.first_name} ${member.last_name}?`)) {
      return
    }

    setIsDeleting(true)

    try {
      await staffService.deleteStaff(member.id)
      toast.success("Groomer removed successfully")
      await fetchGroomers()
    } catch (error: any) {
      console.error("Error deleting groomer:", error)
      toast.error(error.message || "Failed to remove groomer")
    } finally {
      setIsDeleting(false)
    }
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
          <h1 className="text-3xl font-bold">Groomers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your grooming team
          </p>
        </div>
        <Button onClick={() => navigate("/settings/groomers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Groomer
        </Button>
      </div>

      {groomers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No groomers found. Add your first groomer to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {groomers.map((member) => (
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-green-100 text-green-800 border-green-300">
                  Groomer
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/settings/groomers/${member.id}`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(member)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
