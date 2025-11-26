import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import { productsApi } from '../api/products'
import type { Product, ProductCreate } from '../api/products'
import apiClient from '../api/client'

interface Supplier {
  id: number
  name: string
}

export default function Products() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    description: '',
    unit: '',
    price: '',
    discount: null,
    stock: 0,
    min_order_quantity: 1,
    delivery_available: true,
    pickup_available: true,
    lead_time_days: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isSupplierStaff) {
      fetchSuppliers()
    }
  }, [isSupplierStaff])

  useEffect(() => {
    if (selectedSupplierId) {
      fetchProducts(selectedSupplierId)
    }
  }, [selectedSupplierId])

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get<Supplier[]>('/suppliers/my')
      setSuppliers(response.data)
      if (response.data.length > 0) {
        setSelectedSupplierId(response.data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch suppliers')
    }
  }

  const fetchProducts = async (supplierId: number) => {
    setLoading(true)
    try {
      const data = await productsApi.getProducts(supplierId)
      setProducts(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplierId) {
      setError('Please select a supplier')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await productsApi.createProduct(selectedSupplierId, formData)
      setFormData({
        name: '',
        description: '',
        unit: '',
        price: '',
        discount: null,
        stock: 0,
        min_order_quantity: 1,
      })
      setShowCreateForm(false)
      fetchProducts(selectedSupplierId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplierId || !editingProduct) {
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await productsApi.updateProduct(selectedSupplierId, editingProduct.id, formData)
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        unit: '',
        price: '',
        discount: null,
        stock: 0,
        min_order_quantity: 1,
      })
      fetchProducts(selectedSupplierId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (productId: number) => {
    if (!selectedSupplierId) return
    if (!confirm(t('products.confirmDelete', 'Are you sure you want to delete this product?'))) return

    try {
      await productsApi.deleteProduct(selectedSupplierId, productId)
      fetchProducts(selectedSupplierId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete product')
    }
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      unit: product.unit,
      price: product.price,
      discount: product.discount || null,
      stock: product.stock,
      min_order_quantity: product.min_order_quantity,
      delivery_available: product.delivery_available ?? true,
      pickup_available: product.pickup_available ?? true,
      lead_time_days: product.lead_time_days ?? 0,
    })
    setShowCreateForm(true)
  }

  const cancelEdit = () => {
    setEditingProduct(null)
    setShowCreateForm(false)
    setFormData({
      name: '',
      description: '',
      unit: '',
      price: '',
      discount: null,
      stock: 0,
      min_order_quantity: 1,
      delivery_available: true,
      pickup_available: true,
      lead_time_days: 0,
    })
  }

  // Check if user is Owner or Manager (not Sales)
  const isOwnerOrManager = user?.supplier_roles.some(
    (sr) =>
      (sr.role === 'OWNER' || sr.role === 'MANAGER') &&
      (!selectedSupplierId || sr.supplier_id === selectedSupplierId)
  )

  // Web Products page is only for supplier staff
  if (!isSupplierStaff) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {t('common.accessRestricted', 'Access Restricted')}
          </h2>
          <p className="text-yellow-800">
            {t('common.ownersManagersOnly', 'This page is for Supplier Owners and Managers only.')}
          </p>
        </div>
      </div>
    )
  }

  // Only Owner/Manager can manage products
  if (!isOwnerOrManager) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {t('common.accessRestricted', 'Access Restricted')}
          </h2>
          <p className="text-yellow-800">
            {t('products.onlyOwnersManagers', 'Only Supplier Owners and Managers can manage products. Sales staff can only view orders.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('products.catalog')}</h1>
          <p className="text-gray-600 mt-2">
            {t('products.manageForSuppliers', 'Manage products for your suppliers')}
          </p>
        </div>
        {selectedSupplierId && (
          <button
            onClick={() => {
              cancelEdit()
              setShowCreateForm(!showCreateForm)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            {showCreateForm ? t('common.cancel') : t('products.addProduct')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Supplier Selection */}
      {suppliers.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('products.selectSupplier', 'Select Supplier')}
          </label>
          <select
            value={selectedSupplierId || ''}
            onChange={(e) => {
              setSelectedSupplierId(Number(e.target.value))
              setShowCreateForm(false)
              setEditingProduct(null)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} (ID: {supplier.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && selectedSupplierId && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingProduct ? t('products.editProduct') : t('products.addProduct')}
          </h2>
          <form onSubmit={editingProduct ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.unit')} *
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., kg, piece, box"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.price')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: e.target.value ? e.target.value : null,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.stock')} *
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.minOrderQuantity')} *
                </label>
                <input
                  type="number"
                  value={formData.min_order_quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_order_quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.leadTimeDays')} *
                </label>
                <input
                  type="number"
                  value={formData.lead_time_days || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lead_time_days: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('products.leadTimeDescription', 'Number of days until product is ready for delivery/pickup')}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('products.description')}
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="delivery_available"
                  checked={formData.delivery_available ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delivery_available: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="delivery_available" className="ml-2 block text-sm text-gray-700">
                  {t('products.deliveryAvailable')}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pickup_available"
                  checked={formData.pickup_available ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pickup_available: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="pickup_available" className="ml-2 block text-sm text-gray-700">
                  {t('products.pickupAvailable')}
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      {selectedSupplierId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('products.noProducts')}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.unit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.price')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.stock')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('products.minOrderQuantity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {product.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₸{parseFloat(product.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.discount ? `${product.discount}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.min_order_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

