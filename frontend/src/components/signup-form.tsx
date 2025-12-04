import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useState, FormEvent } from "react"
import { authService } from "@/services/authService"
import { toast } from "sonner"
import type { SignupRequest } from "@/types/auth"

interface SignupFormProps extends React.ComponentProps<"div"> {
  onSuccess?: (data: any) => void
}

export function SignupForm({
  className,
  onSuccess,
  ...props
}: SignupFormProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<SignupRequest & { confirmPassword: string }>({
    business_name: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Business name validation
    if (!formData.business_name.trim()) {
      newErrors.business_name = "Business name is required"
    }

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required"
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required"
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const { confirmPassword, ...signupData } = formData
      const response = await authService.signup(signupData)

      toast.success("Account created successfully! Please log in.")

      if (onSuccess) {
        onSuccess(response)
      }
    } catch (error: any) {
      console.error("Signup error:", error)

      if (error.status === 400 && error.message.includes("already registered")) {
        setErrors({ email: "This email is already registered" })
        toast.error("This email is already registered")
      } else {
        toast.error(error.message || "Failed to create account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="business_name">Business Name</FieldLabel>
                <Input
                  id="business_name"
                  type="text"
                  placeholder="Paws & Claws Grooming"
                  required
                  value={formData.business_name}
                  onChange={handleInputChange("business_name")}
                  disabled={isLoading}
                />
                {errors.business_name && (
                  <FieldDescription className="text-red-600">
                    {errors.business_name}
                  </FieldDescription>
                )}
              </Field>
              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    required
                    value={formData.first_name}
                    onChange={handleInputChange("first_name")}
                    disabled={isLoading}
                  />
                  {errors.first_name && (
                    <FieldDescription className="text-red-600">
                      {errors.first_name}
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    required
                    value={formData.last_name}
                    onChange={handleInputChange("last_name")}
                    disabled={isLoading}
                  />
                  {errors.last_name && (
                    <FieldDescription className="text-red-600">
                      {errors.last_name}
                    </FieldDescription>
                  )}
                </Field>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <FieldDescription className="text-red-600">
                    {errors.email}
                  </FieldDescription>
                )}
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange("password")}
                      disabled={isLoading}
                    />
                    {errors.password && (
                      <FieldDescription className="text-red-600">
                        {errors.password}
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange("confirmPassword")}
                      disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                      <FieldDescription className="text-red-600">
                        {errors.confirmPassword}
                      </FieldDescription>
                    )}
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>
                    Sign in
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
