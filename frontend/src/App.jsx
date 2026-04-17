import React, { useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import HutangPiutang from './pages/HutangPiutang'
import Login from './pages/Login'
import Register from './pages/Register'
import ManualTransaction from './pages/ManualTransaction'
import Laporan from './pages/Laporan'
import SaldoAwal from './pages/SaldoAwal'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import ScanRekening from './pages/ScanRekening'
import Onboarding from './pages/Onboarding'
import VerifyEmail from './pages/VerifyEmail'
import TagihanRutin from './pages/TagihanRutin'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminPanel from './pages/AdminPanel'

function IdleTimer({ children }) {
  const navigate = useNavigate()
  const timeout = 10 * 60 * 1000 // 10 menit

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_email')
    localStorage.removeItem('auth_name')
    localStorage.removeItem('auth_role')
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let timer
    const resetTimer = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(logout, timeout)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach((event) => document.addEventListener(event, resetTimer))

    resetTimer()

    return () => {
      if (timer) clearTimeout(timer)
      events.forEach((event) => document.removeEventListener(event, resetTimer))
    }
  }, [logout, timeout])

  return children
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('auth_token')
  if (!token) return <Navigate to="/login" replace />
  return <IdleTimer>{children}</IdleTimer>
}

function RedirectIfAuth({ children }) {
  const token = localStorage.getItem('auth_token')
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPanel />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/tagihan"
          element={
            <RequireAuth>
              <TagihanRutin />
            </RequireAuth>
          }
        />
        <Route
          path="/hutang-piutang"
          element={
            <RequireAuth>
              <HutangPiutang />
            </RequireAuth>
          }
        />
        <Route
          path="/transaksi"
          element={
            <RequireAuth>
              <ManualTransaction />
            </RequireAuth>
          }
        />
        <Route
          path="/saldo"
          element={
            <RequireAuth>
              <SaldoAwal />
            </RequireAuth>
          }
        />
        <Route
          path="/scan"
          element={
            <RequireAuth>
              <ScanRekening />
            </RequireAuth>
          }
        />
        <Route
          path="/laporan"
          element={
            <RequireAuth>
              <Laporan />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Navigate to="/settings/account" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/:tab"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/:group/:tab"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfAuth>
              <Login />
            </RedirectIfAuth>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuth>
              <Register />
            </RedirectIfAuth>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RedirectIfAuth>
              <ForgotPassword />
            </RedirectIfAuth>
          }
        />
        <Route
          path="/reset-password"
          element={
            <RedirectIfAuth>
              <ResetPassword />
            </RedirectIfAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
