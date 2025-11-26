import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

interface Product {
  id: number
  name: string
  description: string
  unit: string
  price: string
  discount: string
  stock: number
  min_order_quantity: number
}

export default function Catalog() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isConsumer = user?.main_role === 'CONSUMER' || user?.consumer_id !== null

  useEffect(() => {
    if (!isConsumer) {
      setError('This page is only available for consumers')
    }
  }, [user, isConsumer])

  const fetchCatalog = async () => {
    if (!supplierId) return

    setLoading(true)
    setError('')

    try {
      // Note: You'll need to implement a /suppliers/{id}/products endpoint
      // For now, this is a placeholder
      const response = await apiClient.get(`/suppliers/${supplierId}/products`)
      setProducts(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch catalog')
    } finally {
      setLoading(false)
    }
  }

  if (!isConsumer) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          This page is only available for consumers
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Catalog</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Select Supplier
        </h2>
        <div className="flex gap-4">
          <input
            type="number"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="Supplier ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={fetchCatalog}
            disabled={loading || !supplierId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Catalog'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {product.name}
            </h3>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold text-gray-900">
                  ₸{parseFloat(product.price).toFixed(2)} / {product.unit}
                </span>
              </div>
              {parseFloat(product.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">{product.discount}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Stock:</span>
                <span className="font-semibold text-gray-900">{product.stock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Min Order:</span>
                <span className="font-semibold text-gray-900">
                  {product.min_order_quantity} {product.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && supplierId && !loading && (
        <div className="text-center py-8 text-gray-500">No products found</div>
      )}
    </div>
  )
}

