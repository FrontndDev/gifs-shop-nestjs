"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type DownloadItem = {
  productId: string
  filename: string
  downloadUrl?: string
  expiresAt?: string
  hasPrivateFile?: boolean
  error?: string
}

type Order = {
  id: string
  name: string
  telegramDiscord: string
  steamProfile: string
  style: string
  colorTheme: string
  details: string
  status: string
  paymentProvider?: string
  currency?: string
  createdAt: string
  updatedAt: string
  downloads?: DownloadItem[]
}

export default function DownloadPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Order not found')
          }
          throw new Error('Failed to fetch order')
        }
        
        const orderData = await response.json()
        setOrder(orderData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const formatExpiresAt = (expiresAt: string) => {
    const date = new Date(expiresAt)
    return date.toLocaleString()
  }

  const handleDownload = (downloadUrl: string, filename: string) => {
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error</div>
          <div className="text-gray-300">{error}</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Order not found</div>
      </div>
    )
  }

  if (order.status !== 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-400 text-xl mb-4">Order Not Paid</div>
          <div className="text-gray-300">This order is not paid yet. Downloads are not available.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20">
          <h1 className="text-3xl font-bold text-white mb-6">Your Downloads</h1>
          
          <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <h2 className="text-xl font-semibold text-white mb-2">Order Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Order ID:</span>
                <span className="text-white ml-2 font-mono">{order.id}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 ml-2 capitalize">{order.status}</span>
              </div>
              <div>
                <span className="text-gray-400">Payment:</span>
                <span className="text-white ml-2">
                  {order.paymentProvider?.toUpperCase()} ({order.currency})
                </span>
              </div>
              <div>
                <span className="text-gray-400">Date:</span>
                <span className="text-white ml-2">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {order.downloads && order.downloads.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Available Downloads</h2>
              <div className="space-y-4">
                {order.downloads.map((download, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium mb-1">
                          File: {download.filename}
                        </div>
                        {download.expiresAt && (
                          <div className="text-sm text-gray-400 mb-2">
                            Expires: {formatExpiresAt(download.expiresAt)}
                          </div>
                        )}
                        {download.error && (
                          <div className="text-sm text-red-400">
                            Error: {download.error}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {download.downloadUrl ? (
                          <button
                            onClick={() => handleDownload(download.downloadUrl!, download.filename)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Download
                          </button>
                        ) : (
                          <div className="text-gray-400 text-sm">
                            {download.error || 'Download not available'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                <div className="text-yellow-200 text-sm">
                  <strong>Important:</strong> Download links expire after 24 hours. 
                  You can download your files multiple times within this period.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg">No downloads available for this order.</div>
              <div className="text-gray-500 text-sm mt-2">
                This order may not contain any digital products with downloadable files.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
