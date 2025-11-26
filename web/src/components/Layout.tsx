import type { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        {isAuthenticated && <Sidebar />}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

