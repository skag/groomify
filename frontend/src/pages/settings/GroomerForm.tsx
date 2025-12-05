import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { staffService } from "@/services/staffService"
import type {
  CreateStaffRequest,
  UpdateStaffRequest,
  CompensationType,
  SalaryPeriod,
  StaffAvailability,
} from "@/types/staff"

interface WorkHours {
  enabled: boolean
  startTime: string
  endTime: string
}

interface GroomerFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  startDate: string
  password: string
  // Compensation
  compensationType: CompensationType
  salaryRate: string
  salaryPeriod: SalaryPeriod
  commissionPercent: string
  tipPercent: string
  // Work hours
  workHours: Record<string, WorkHours>
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
]

const DEFAULT_WORK_HOURS: Record<string, WorkHours> = {
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
}

export default function GroomerForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [activeTab, setActiveTab] = useState("info")

  const [formData, setFormData] = useState<GroomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    startDate: "",
    password: "",
    compensationType: "salary",
    salaryRate: "",
    salaryPeriod: "hour",
    commissionPercent: "",
    tipPercent: "100",
    workHours: DEFAULT_WORK_HOURS,
  })

  // Fetch existing groomer data when editing
  useEffect(() => {
    if (isEditing && id) {
      fetchGroomer(parseInt(id))
    }
  }, [id, isEditing])

  const fetchGroomer = async (groomerId: number) => {
    setIsFetching(true)
    try {
      // Fetch groomer data and availability in parallel
      const [groomer, availability] = await Promise.all([
        staffService.getStaffById(groomerId),
        staffService.getAvailability(groomerId).catch(() => [] as StaffAvailability[]),
      ])

      if (groomer.role !== "groomer") {
        toast.error("This staff member is not a groomer")
        navigate("/settings/groomers")
        return
      }

      // Convert availability from API format to form format
      const workHours = { ...DEFAULT_WORK_HOURS }
      if (availability.length > 0) {
        const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        availability.forEach((entry) => {
          const dayKey = dayKeys[entry.day_of_week]
          if (dayKey) {
            workHours[dayKey] = {
              enabled: entry.is_available,
              startTime: entry.start_time ? entry.start_time.substring(0, 5) : "09:00",
              endTime: entry.end_time ? entry.end_time.substring(0, 5) : "17:00",
            }
          }
        })
      }

      setFormData({
        firstName: groomer.first_name,
        lastName: groomer.last_name,
        email: groomer.email,
        phone: groomer.phone || "",
        startDate: groomer.start_date ? groomer.start_date.split("T")[0] : "",
        password: "",
        compensationType: groomer.compensation_type || "salary",
        salaryRate: groomer.salary_rate || "",
        salaryPeriod: groomer.salary_period || "hour",
        commissionPercent: groomer.commission_percent || "",
        tipPercent: groomer.tip_percent || "100",
        workHours,
      })
    } catch (error: any) {
      console.error("Error fetching groomer:", error)
      toast.error(error.message || "Failed to load groomer")
      navigate("/settings/groomers")
    } finally {
      setIsFetching(false)
    }
  }

  const handleChange = <K extends keyof GroomerFormData>(
    field: K,
    value: GroomerFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleWorkHoursChange = (
    day: string,
    field: keyof WorkHours,
    value: boolean | string
  ) => {
    setFormData((prev) => ({
      ...prev,
      workHours: {
        ...prev.workHours,
        [day]: {
          ...prev.workHours[day],
          [field]: value,
        },
      },
    }))
  }

  // Convert form work hours to API availability format
  const buildAvailabilityPayload = () => {
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    return dayKeys.map((dayKey, index) => {
      const hours = formData.workHours[dayKey]
      return {
        day_of_week: index,
        is_available: hours.enabled,
        start_time: hours.startTime + ":00", // API expects HH:MM:SS
        end_time: hours.endTime + ":00",
      }
    })
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill in all required fields")
      setActiveTab("info")
      return
    }

    setIsLoading(true)

    try {
      let groomerId: number

      if (isEditing && id) {
        groomerId = parseInt(id)
        const updateData: UpdateStaffRequest = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone.trim() || undefined,
          role: "groomer",
          start_date: formData.startDate || undefined,
          // Compensation data
          compensation_type: formData.compensationType,
          salary_rate: formData.compensationType === "salary" && formData.salaryRate
            ? parseFloat(formData.salaryRate)
            : undefined,
          salary_period: formData.compensationType === "salary"
            ? formData.salaryPeriod
            : undefined,
          commission_percent: formData.compensationType === "commission" && formData.commissionPercent
            ? parseFloat(formData.commissionPercent)
            : undefined,
          tip_percent: formData.tipPercent ? parseFloat(formData.tipPercent) : undefined,
        }

        if (formData.password && formData.password.trim()) {
          updateData.password = formData.password.trim()
        }

        await staffService.updateStaff(groomerId, updateData)
      } else {
        const createData: CreateStaffRequest = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone.trim() || undefined,
          role: "groomer",
          start_date: formData.startDate || undefined,
          // Compensation data
          compensation_type: formData.compensationType,
          salary_rate: formData.compensationType === "salary" && formData.salaryRate
            ? parseFloat(formData.salaryRate)
            : undefined,
          salary_period: formData.compensationType === "salary"
            ? formData.salaryPeriod
            : undefined,
          commission_percent: formData.compensationType === "commission" && formData.commissionPercent
            ? parseFloat(formData.commissionPercent)
            : undefined,
          tip_percent: formData.tipPercent ? parseFloat(formData.tipPercent) : undefined,
        }

        if (formData.password && formData.password.trim()) {
          createData.password = formData.password.trim()
        }

        const createdGroomer = await staffService.createStaff(createData)
        groomerId = createdGroomer.id
      }

      // Save availability (work hours)
      await staffService.updateAvailability(groomerId, {
        availability: buildAvailabilityPayload(),
      })

      toast.success(isEditing ? "Groomer updated successfully" : "Groomer added successfully")
      navigate("/settings/groomers")
    } catch (error: any) {
      console.error("Error saving groomer:", error)
      toast.error(error.message || "Failed to save groomer")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings/groomers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings/groomers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Edit Groomer" : "Add Groomer"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing
                ? "Update groomer information and settings"
                : "Add a new groomer to your team"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Basic Info & Compensation</TabsTrigger>
          <TabsTrigger value="hours">Work Hours</TabsTrigger>
        </TabsList>

        {/* Basic Info & Compensation Tab */}
        <TabsContent value="info" className="space-y-6 mt-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Enter first name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
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
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="groomer@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {isEditing ? "" : "(Optional)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder={
                  isEditing
                    ? "Leave blank to keep current password"
                    : "Optional - for full account access"
                }
              />
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? "Only enter a password if you want to change it"
                  : "Groomers can use PIN for POS access or password for full account login"}
              </p>
            </div>
          </div>

          {/* Compensation Section */}
          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-lg font-semibold">Compensation</h2>

            <div className="space-y-2">
              <Label>Compensation Type</Label>
              <Select
                value={formData.compensationType}
                onValueChange={(value: CompensationType) =>
                  handleChange("compensationType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.compensationType === "salary" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryRate">Rate ($)</Label>
                  <Input
                    id="salaryRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salaryRate}
                    onChange={(e) => handleChange("salaryRate", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Per</Label>
                  <Select
                    value={formData.salaryPeriod}
                    onValueChange={(value: SalaryPeriod) =>
                      handleChange("salaryPeriod", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Hour</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="commissionPercent">Commission (%)</Label>
                <Input
                  id="commissionPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionPercent}
                  onChange={(e) => handleChange("commissionPercent", e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of service revenue the groomer receives
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tipPercent">Tip (%)</Label>
              <Input
                id="tipPercent"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.tipPercent}
                onChange={(e) => handleChange("tipPercent", e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">
                Percentage of tips the groomer keeps (default 100%)
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Work Hours Tab */}
        <TabsContent value="hours" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Work Hours</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set the groomer's regular working schedule
              </p>
            </div>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.key}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 w-36">
                    <Checkbox
                      id={`${day.key}-enabled`}
                      checked={formData.workHours[day.key].enabled}
                      onCheckedChange={(checked) =>
                        handleWorkHoursChange(day.key, "enabled", Boolean(checked))
                      }
                    />
                    <Label
                      htmlFor={`${day.key}-enabled`}
                      className="font-medium cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>

                  {formData.workHours[day.key].enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={formData.workHours[day.key].startTime}
                        onChange={(e) =>
                          handleWorkHoursChange(day.key, "startTime", e.target.value)
                        }
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={formData.workHours[day.key].endTime}
                        onChange={(e) =>
                          handleWorkHoursChange(day.key, "endTime", e.target.value)
                        }
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Day off</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={() => navigate("/settings/groomers")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Update Groomer" : "Add Groomer"}
        </Button>
      </div>
    </div>
  )
}
