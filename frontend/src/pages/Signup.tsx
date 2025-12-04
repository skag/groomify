import { SignupForm } from "@/components/signup-form"
import { useNavigate } from "react-router-dom"

export default function Signup() {
  const navigate = useNavigate()

  const handleSuccess = () => {
    // Redirect to login after successful signup
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <SignupForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
