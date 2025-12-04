import { LoginForm } from "@/components/login-form"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const handleSignupClick = () => {
    navigate("/signup")
  }

  const handleSuccess = (data: any) => {
    // Update auth context
    login(data)

    // Redirect to the page they tried to access, or dashboard
    const from = (location.state as any)?.from?.pathname || "/"
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <LoginForm onSignupClick={handleSignupClick} onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
