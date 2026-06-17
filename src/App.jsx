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
import SOPList from './pages/operations/SOPList'
import SOPForm from './pages/operations/SOPForm'
import SOPDetail from './pages/operations/SOPDetail'
import BatchList from './pages/operations/BatchList'
import BatchForm from './pages/operations/BatchForm'
import BatchDetail from './pages/operations/BatchDetail'
import ProductionLogList from './pages/operations/ProductionLogList'
import ProductionLogForm from './pages/operations/ProductionLogForm'
import ProductionLogDetail from './pages/operations/ProductionLogDetail'
import CustomerList from './pages/operations/CustomerList'
import CustomerForm from './pages/operations/CustomerForm'
import CustomerDetail from './pages/operations/CustomerDetail'
import IngredientList from './pages/operations/IngredientList'
import IngredientForm from './pages/operations/IngredientForm'
import IngredientDetail from './pages/operations/IngredientDetail'
import ReceiveInventory from './pages/operations/ReceiveInventory'
import LotList from './pages/operations/LotList'
import LotDetail from './pages/operations/LotDetail'
import RecallTrace from './pages/operations/RecallTrace'
import Timecard from './pages/Timecard'
import UserRoles from './pages/admin/UserRoles'
import TimecardAdmin from './pages/admin/TimecardAdmin'

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
            {/* Operations — production */}
            <Route path="operations/sops" element={<SOPList />} />
            <Route path="operations/sops/new" element={<SOPForm />} />
            <Route path="operations/sops/:id" element={<SOPDetail />} />
            <Route path="operations/sops/:id/edit" element={<SOPForm />} />
            <Route path="operations/batches" element={<BatchList />} />
            <Route path="operations/batches/new" element={<BatchForm />} />
            <Route path="operations/batches/:id" element={<BatchDetail />} />
            <Route path="operations/logs" element={<ProductionLogList />} />
            <Route path="operations/logs/new" element={<ProductionLogForm />} />
            <Route path="operations/logs/:id" element={<ProductionLogDetail />} />
            <Route path="operations/customers" element={<CustomerList />} />
            <Route path="operations/customers/new" element={<CustomerForm />} />
            <Route path="operations/customers/:id" element={<CustomerDetail />} />
            <Route path="operations/customers/:id/edit" element={<CustomerForm />} />
            {/* Operations — inventory */}
            <Route path="operations/ingredients" element={<IngredientList />} />
            <Route path="operations/ingredients/new" element={<IngredientForm />} />
            <Route path="operations/ingredients/:id" element={<IngredientDetail />} />
            <Route path="operations/ingredients/:id/edit" element={<IngredientForm />} />
            <Route path="operations/receive" element={<ReceiveInventory />} />
            <Route path="operations/lots" element={<LotList />} />
            <Route path="operations/lots/:id" element={<LotDetail />} />
            <Route path="operations/recall" element={<RecallTrace />} />
            {/* Timecard */}
            <Route path="timecard" element={<Timecard />} />
            {/* Admin */}
            <Route path="admin/users" element={<UserRoles />} />
            <Route path="admin/timecards" element={<TimecardAdmin />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
