import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Links from './pages/Links'
import OrdersPage from './pages/OrdersPage'
import Products from './pages/Products'
import Complaints from './pages/Complaints'
import Staff from './pages/Staff'
import ChatList from './pages/ChatList'
import Chat from './pages/Chat'

// Debug: Log when App component renders
console.log('App component is rendering...')

function App() {
  console.log('App function executing...')
  
  try {
    return (
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/links"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Links />
                  </ProtectedRoute>
                </Layout>
              }
            />
            {/* Catalog removed - consumers only use mobile */}
            <Route
              path="/orders"
              element={
                <Layout>
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/products"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/complaints"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Complaints />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/staff"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Staff />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/chat"
              element={
                <Layout>
                  <ProtectedRoute>
                    <ChatList />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/chat/:supplierId/:consumerId"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('Error in App component:', error)
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error in App Component</h1>
        <pre>{String(error)}</pre>
      </div>
    )
  }
}

export default App
