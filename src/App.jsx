import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InspectionHistory from './pages/inspections/InspectionHistory'
import StartInspection from './pages/inspections/StartInspection'
import InspectionDetail from './pages/inspections/InspectionDetail'
import NewCleaningLog from './pages/cleaning/NewCleaningLog'
import CleaningHistory from './pages/cleaning/CleaningHistory'
import CleaningDetail from './pages/cleaning/CleaningDetail'
import CorrectiveActionList from './pages/correctiveActions/CorrectiveActionList'
import CorrectiveActionDetail from './pages/correctiveActions/CorrectiveActionDetail'
import Records from './pages/records/Records'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inspections" element={<InspectionHistory />} />
            <Route path="inspections/new/:type" element={<StartInspection />} />
            <Route path="inspections/:id" element={<InspectionDetail />} />
            <Route path="cleaning" element={<CleaningHistory />} />
            <Route path="cleaning/new" element={<NewCleaningLog />} />
            <Route path="cleaning/:id" element={<CleaningDetail />} />
            <Route path="corrective-actions" element={<CorrectiveActionList />} />
            <Route path="corrective-actions/:id" element={<CorrectiveActionDetail />} />
            <Route path="records" element={<Records />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
