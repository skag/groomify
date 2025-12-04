import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import DashboardHome from './pages/DashboardHome'
import Today from './pages/Today'
import Customers from './pages/Customers'
import CustomersAdd from './pages/CustomersAdd'
import CustomerDetail from './pages/CustomerDetail'
import Pets from './pages/Pets'
import Appointments from './pages/Appointments'
import Settings from './pages/Settings'
import AccountSettings from './pages/settings/Account'
import StaffSettings from './pages/settings/Staff'
import ServicesSettings from './pages/settings/Services'
import AgreementsSettings from './pages/settings/Agreements'
import RemindersSettings from './pages/settings/Reminders'
import IntegrationsSettings from './pages/settings/Integrations'
import Login from './pages/Login'
import Signup from './pages/Signup'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Dashboard routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/today"
            element={
              <ProtectedRoute>
                <Today />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/add"
            element={
              <ProtectedRoute>
                <CustomersAdd />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <CustomerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pets"
            element={
              <ProtectedRoute>
                <Pets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/:petId"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />

          {/* Protected Settings routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/settings/account" replace />} />
            <Route path="account" element={<AccountSettings />} />
            <Route path="staff" element={<StaffSettings />} />
            <Route path="services" element={<ServicesSettings />} />
            <Route path="agreements" element={<AgreementsSettings />} />
            <Route path="reminders" element={<RemindersSettings />} />
            <Route path="integrations" element={<IntegrationsSettings />} />
          </Route>

          {/* Redirect all unknown routes to home (which will redirect to login if not authenticated) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
